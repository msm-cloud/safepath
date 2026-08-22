// Applies every migration in supabase/migrations/ to an in-process WASM
// Postgres (no Docker/local Supabase stack required) and exercises RLS as
// real, distinct authenticated users would see it — not as the superuser
// role that owns the tables. Run with `pnpm test:rls`.
//
// This is a smoke test for schema/policy correctness, not a substitute for
// testing against a real Supabase project.

import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

const db = new PGlite({ extensions: { pgcrypto } });

// Minimal stand-in for what a real Supabase project already has set up
// (auth schema, roles) before any of our migrations run.
const bootstrap = `
create schema if not exists extensions;
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end
$$;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Reads a per-session GUC so tests can simulate "logged in as X" (or nobody).
create or replace function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`;

await db.exec(bootstrap);

const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
for (const file of files) {
  await db.exec(await readFile(path.join(MIGRATIONS_DIR, file), 'utf8'));
}
console.log(`applied ${files.length} migrations.\n`);

// Let the `authenticated` role actually use the tables/functions (mirrors
// the grants in the migrations, which is what makes RLS meaningful instead
// of erroring out on privilege checks first).
await db.exec(`grant usage on schema public to authenticated;`);

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

// Runs `fn` as `userId` (or as an unauthenticated session if userId is
// falsy), in its own transaction. Each call gets a fresh transaction so an
// expected error inside `fn` never poisons a later, unrelated call.
async function asUser(userId, fn) {
  await db.exec('begin;');
  await db.exec(`set local role authenticated;`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, true);`, [userId ?? '']);
  try {
    return await fn();
  } finally {
    await db.exec('commit;');
  }
}

async function redeem(db_, inviteCode) {
  const r = await db_.query(`select public.redeem_guardian_invite($1) as result`, [inviteCode]);
  const raw = r.rows[0].result;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

// --- Set up users: A (at-risk user), G/G2 (guardians), X (unrelated) ---
const mkUser = async (name, role) => {
  const r = await db.query(
    `insert into auth.users (raw_user_meta_data) values ($1::jsonb) returning id`,
    [JSON.stringify({ role, full_name: name })]
  );
  return r.rows[0].id;
};
const userA = await mkUser('A', 'user');
const userG = await mkUser('G', 'guardian');
const userG2 = await mkUser('G2', 'guardian');
const userX = await mkUser('X', 'user');
console.log(`userA=${userA}\nuserG=${userG}\nuserG2=${userG2}\nuserX=${userX}\n`);

console.log('--- profiles RLS ---');
await asUser(userA, async () => {
  const own = await db.query(`select id from public.profiles where id = '${userA}'`);
  check('A can select own profile', own.rows.length === 1);

  const others = await db.query(`select id from public.profiles where id = '${userX}'`);
  check('A cannot select unrelated profile', others.rows.length === 0);
});

console.log('\n--- guardian_links: invite creation ---');
let inviteCode;
await asUser(userA, async () => {
  const ins = await db.query(
    `insert into public.guardian_links (user_id) values ('${userA}') returning invite_code`
  );
  inviteCode = ins.rows[0].invite_code;
  check('A can create an invite for themselves', !!inviteCode && inviteCode.length === 8);
});

await asUser(userX, async () => {
  try {
    await db.query(`insert into public.guardian_links (user_id) values ('${userA}')`);
    check('X cannot create an invite for A (should have thrown)', false);
  } catch {
    check('X cannot create an invite for A', true);
  }
});

console.log(
  '\n--- guardian_links: pending invites are NOT visible via SELECT to non-parties, in any shape ---'
);
await asUser(userX, async () => {
  const noFilter = await db.query(`select * from public.guardian_links`);
  check('X: select * returns nothing', noFilter.rows.length === 0);

  const byStatus = await db.query(`select * from public.guardian_links where status = 'pending'`);
  check('X: select where status=pending returns nothing', byStatus.rows.length === 0);

  const byCode = await db.query(
    `select * from public.guardian_links where invite_code = '${inviteCode}'`
  );
  check('X: select by exact invite_code returns nothing', byCode.rows.length === 0);

  const count = await db.query(`select count(*) as n from public.guardian_links`);
  check('X: count(*) is 0', Number(count.rows[0].n) === 0);
});

await asUser(userG, async () => {
  // G is not yet a party to this link, so — same as X above — RLS hides it,
  // even though G knows the exact invite_code. This is the actual fix:
  // knowing the code no longer grants raw SELECT access to the row.
  const byCode = await db.query(
    `select * from public.guardian_links where invite_code = '${inviteCode}'`
  );
  check('G (pre-redemption) cannot see the pending row by code either', byCode.rows.length === 0);
});

console.log('\n--- guardian_links: direct UPDATE is gone entirely ---');
// The UPDATE grant itself was revoked (not just the policy), so Postgres
// rejects these before RLS is even consulted — a hard "permission denied",
// not a silent zero-row update.
await asUser(userG, async () => {
  try {
    await db.query(
      `update public.guardian_links set guardian_id = '${userG}', status = 'accepted' where invite_code = '${inviteCode}'`
    );
    check('G cannot redeem via direct UPDATE anymore (should have thrown)', false);
  } catch (err) {
    check(
      'G cannot redeem via direct UPDATE anymore (permission denied)',
      /permission denied/.test(err.message)
    );
  }
});

await asUser(userA, async () => {
  // Even the owning user has no UPDATE grant on this table at all anymore.
  try {
    await db.query(
      `update public.guardian_links set status = 'revoked' where invite_code = '${inviteCode}'`
    );
    check('A (the owner) also cannot UPDATE guardian_links directly (should have thrown)', false);
  } catch (err) {
    check(
      'A (the owner) also cannot UPDATE guardian_links directly (permission denied)',
      /permission denied/.test(err.message)
    );
  }
});

console.log('\n--- redeem_guardian_invite() ---');
await asUser(null, async () => {
  const result = await redeem(db, inviteCode);
  check(
    'unauthenticated call is rejected',
    result.success === false && result.error === 'not_authenticated'
  );
});

await asUser(userX, async () => {
  const result = await redeem(db, 'NOTAREAL');
  check(
    'garbage invite code fails with invalid_or_used_code',
    result.success === false && result.error === 'invalid_or_used_code'
  );
});

await asUser(userG, async () => {
  const result = await redeem(db, inviteCode);
  check(
    'first redemption succeeds and returns the inviter user_id + user_name',
    result.success === true && result.user_id === userA && result.user_name === 'A'
  );
});

await asUser(userG, async () => {
  const row = await db.query(
    `select status, guardian_id, accepted_at from public.guardian_links where invite_code = '${inviteCode}'`
  );
  check(
    'redemption actually persisted guardian_id/status/accepted_at',
    row.rows.length === 1 &&
      row.rows[0].status === 'accepted' &&
      row.rows[0].guardian_id === userG &&
      row.rows[0].accepted_at !== null
  );

  // G is now a party, so plain SELECT works via guardian_links_select_parties_only.
  check('G can now SELECT the link directly (they are a party)', row.rows.length === 1);
});

await asUser(userG2, async () => {
  const result = await redeem(db, inviteCode);
  check(
    'second redemption attempt (same code, different guardian) fails',
    result.success === false && result.error === 'invalid_or_used_code'
  );
});

await asUser(userG, async () => {
  const result = await redeem(db, inviteCode);
  check(
    're-redeeming by the same guardian also fails (already accepted)',
    result.success === false && result.error === 'invalid_or_used_code'
  );
});

console.log('\n--- profiles visibility after acceptance (unchanged by this patch) ---');
await asUser(userG, async () => {
  const profileOfA = await db.query(`select id from public.profiles where id = '${userA}'`);
  check('accepted guardian G can select A profile', profileOfA.rows.length === 1);
});

await asUser(userX, async () => {
  const profileOfA = await db.query(`select id from public.profiles where id = '${userA}'`);
  check('unrelated X still cannot select A profile', profileOfA.rows.length === 0);
});

console.log(
  '\n--- alerts: owner + guardian column-restricted update (unchanged by this patch) ---'
);
let alertId;
await asUser(userA, async () => {
  const ins = await db.query(
    `insert into public.alerts (user_id, last_lat, last_lng) values ('${userA}', 23.8, 90.4) returning id`
  );
  alertId = ins.rows[0].id;
  check('A can create their own alert', !!alertId);
});

await asUser(userG, async () => {
  const seen = await db.query(`select id from public.alerts where id = '${alertId}'`);
  check('accepted guardian G can see A alert', seen.rows.length === 1);

  try {
    await db.query(`update public.alerts set last_lat = 0, last_lng = 0 where id = '${alertId}'`);
    check('guardian cannot change alert location fields (should have thrown)', false);
  } catch {
    check('guardian cannot change alert location fields', true);
  }
});

// Separate transaction: the previous one is aborted at the Postgres level
// after the expected error above, so a fresh transaction is needed here.
await asUser(userG, async () => {
  const updated = await db.query(
    `update public.alerts set status = 'resolved' where id = '${alertId}' returning status, resolved_at`
  );
  check(
    'guardian CAN update alert status only, and resolved_at auto-stamps',
    updated.rows.length === 1 &&
      updated.rows[0].status === 'resolved' &&
      updated.rows[0].resolved_at !== null
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
