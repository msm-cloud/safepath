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
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
end
$$;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
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

// Let the `authenticated`/`anon` roles actually use the tables/functions
// (mirrors the grants in the migrations, which is what makes RLS
// meaningful instead of erroring out on privilege checks first). A real
// Supabase project grants schema usage to both roles by default; pglite
// starts from a blank slate, so this test harness has to do it itself.
await db.exec(`grant usage on schema public to authenticated;`);
await db.exec(`grant usage on schema public to anon;`);

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

// Runs `fn` as the actual `anon` Postgres role (not just `authenticated`
// with no jwt.sub) — needed to confirm resolve_login_identifier's grant
// really does let a pre-auth caller invoke it, not just that the function
// behaves correctly when called some other way.
async function asAnon(fn) {
  await db.exec('begin;');
  await db.exec(`set local role anon;`);
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
// email is deterministic (name lowercased) so resolve_login_identifier
// tests below can assert on the exact expected value, not just "some
// string".
const mkUser = async (name, role) => {
  const email = `${name.toLowerCase()}@example.com`;
  const r = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
    [email, JSON.stringify({ role, full_name: name })]
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

// profiles_update_own had no direct test coverage before the shake-SOS /
// fake-call settings columns were added — confirming here (not just
// inferring from reading the migration) that it's a plain row-level
// policy with no column restrictions, so the three new columns are
// already covered by the existing "id = auth.uid()" check with no RLS
// changes needed.
console.log('\n--- profiles RLS: update (including new safety-feature settings columns) ---');
await asUser(userA, async () => {
  const updated = await db.query(
    `update public.profiles
       set shake_sos_enabled = true,
           fake_call_enabled = false,
           fake_call_caller_name = 'Apu'
     where id = '${userA}'
     returning shake_sos_enabled, fake_call_enabled, fake_call_caller_name`
  );
  check(
    'A can update their own shake_sos_enabled/fake_call_enabled/fake_call_caller_name',
    updated.rows.length === 1 &&
      updated.rows[0].shake_sos_enabled === true &&
      updated.rows[0].fake_call_enabled === false &&
      updated.rows[0].fake_call_caller_name === 'Apu'
  );
});

await asUser(userX, async () => {
  const updated = await db.query(
    `update public.profiles set shake_sos_enabled = true where id = '${userA}' returning id`
  );
  check(
    "X cannot update A's profile (zero rows affected, not an error)",
    updated.rows.length === 0
  );
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

console.log('\n--- profiles visibility after acceptance ---');
await asUser(userG, async () => {
  const profileOfA = await db.query(`select id from public.profiles where id = '${userA}'`);
  check('accepted guardian G can select A profile', profileOfA.rows.length === 1);
});

await asUser(userX, async () => {
  const profileOfA = await db.query(`select id from public.profiles where id = '${userA}'`);
  check('unrelated X still cannot select A profile', profileOfA.rows.length === 0);
});

// profiles_select_by_own_guardian (added alongside the auth/guardian-invite
// feature): the reverse direction of the check above — the at-risk user
// needs to see their own accepted guardian's profile (for full_name) too.
await asUser(userA, async () => {
  const profileOfG = await db.query(`select id from public.profiles where id = '${userG}'`);
  check('A can select their own accepted guardian G profile', profileOfG.rows.length === 1);

  const profileOfG2 = await db.query(`select id from public.profiles where id = '${userG2}'`);
  check(
    'A cannot select G2 profile — G2 only attempted redemption, never accepted',
    profileOfG2.rows.length === 0
  );
});

await asUser(userX, async () => {
  const profileOfG = await db.query(`select id from public.profiles where id = '${userG}'`);
  check(
    "unrelated X cannot select G's profile via this policy either",
    profileOfG.rows.length === 0
  );
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

console.log('\n--- alerts: resolved alerts remain visible (dashboard Past Alerts feature) ---');
// alerts_select_own_or_accepted_guardian's USING clause has no `status`
// filter at all — it was never scoped to 'active' only. Confirming that
// directly here (rather than just reading the migration) is what lets the
// dashboard's Past Alerts section query resolved alerts without any new
// migration.
await asUser(userA, async () => {
  const seen = await db.query(
    `select id, status from public.alerts where id = '${alertId}' and status = 'resolved'`
  );
  check('owner A can still select their own resolved alert', seen.rows.length === 1);
});

await asUser(userG, async () => {
  const seen = await db.query(
    `select id, status from public.alerts where id = '${alertId}' and status = 'resolved'`
  );
  check('accepted guardian G can still select the resolved alert', seen.rows.length === 1);
});

await asUser(userX, async () => {
  const seen = await db.query(
    `select id from public.alerts where id = '${alertId}' and status = 'resolved'`
  );
  check('unrelated X still cannot select the resolved alert', seen.rows.length === 0);
});

console.log('\n--- alerts_notify_guardians_on_insert trigger (SOS notification backend) ---');
// What this DOES prove locally: the trigger + function exist, are wired to
// the right table/event, and firing them on a real INSERT never blocks or
// errors the alert row from being created — even though pg_net and Vault
// are both unavailable in this pglite environment. That's not an accident:
// the migration's extension-creation is wrapped in a DO block with an
// exception handler, and the trigger function itself wraps its Vault
// lookup + net.http_post call in its own exception handler (see
// supabase/migrations/20260822153852_alert_guardian_notification_trigger.sql)
// specifically so a missing pg_net/vault schema — or any other notification
// plumbing failure — degrades to a warning instead of ever blocking an SOS
// alert from being recorded.
//
// What this does NOT and CANNOT prove locally: that net.http_post actually
// reaches the deployed send-alert-email Edge Function, that the
// Authorization header built from the Vault secret is correct, or that the
// Edge Function successfully emails guardians. pglite doesn't bundle
// pg_net (it needs real background workers + real networking, which a
// single-process WASM Postgres can't provide) or Supabase Vault (a
// Supabase-platform feature, not a core/contrib Postgres extension).
// Verifying that end-to-end needs a real Supabase project with this
// migration applied, the `edge_function_auth` Vault secret actually set,
// the Function deployed, and a real alert row inserted.

const triggerCatalog = await db.query(`
  select
    (select count(*) from pg_proc where proname = 'notify_guardians_on_alert') as fn_count,
    (select count(*) from pg_trigger where tgname = 'alerts_notify_guardians_on_insert' and not tgisinternal) as trigger_count
`);
check(
  'notify_guardians_on_alert() function and its trigger both exist',
  Number(triggerCatalog.rows[0].fn_count) === 1 &&
    Number(triggerCatalog.rows[0].trigger_count) === 1
);

await asUser(userA, async () => {
  // This INSERT fires alerts_notify_guardians_on_insert for real. If the
  // trigger's exception handling around the missing pg_net/vault schemas
  // were broken, this insert would throw instead of returning a row.
  const ins = await db.query(
    `insert into public.alerts (user_id, last_lat, last_lng) values ('${userA}', 23.7, 90.5) returning id`
  );
  check(
    'inserting an alert with the notification trigger attached does not error',
    ins.rows.length === 1 && !!ins.rows[0].id
  );
});

console.log('\n--- enable_realtime_on_alerts migration (Realtime publication) ---');
// What this proves locally: the migration applies without erroring even
// though pglite has no logical replication support at all — confirmed
// below by checking that no `supabase_realtime` publication exists here,
// which means the ALTER PUBLICATION statement itself could not have
// succeeded. The migration completing anyway is direct evidence its DO
// block's exception handler is what actually ran, degrading to a notice
// exactly like the pg_net setup above — not a false pass from the happy
// path silently no-op'ing.
//
// What this does NOT and CANNOT prove locally: that Realtime actually
// delivers postgres_changes events to a subscribed client, or that
// delivery is correctly scoped by RLS. A database-only test can't exercise
// that at all — it needs a real Supabase project's Realtime service and an
// actual subscribed client. The RLS policy this relies on
// (alerts_select_own_or_accepted_guardian) is already thoroughly covered
// above via direct SELECT, and Realtime is documented to reuse those same
// policies — strong indirect evidence, but not a substitute for a live
// end-to-end check.
const publicationExists = await db.query(`
  select count(*) as n from pg_publication where pubname = 'supabase_realtime'
`);
check(
  'confirms the graceful-degradation path ran: no supabase_realtime publication exists in pglite, yet the migration completed without error',
  Number(publicationExists.rows[0].n) === 0
);

console.log('\n--- journeys RLS ---');
let journeyId;
await asUser(userA, async () => {
  const ins = await db.query(
    `insert into public.journeys (user_id, destination_note, expected_arrival_at) values ('${userA}', 'walking home', now() + interval '30 minutes') returning id`
  );
  journeyId = ins.rows[0].id;
  check('A can create their own journey', !!journeyId);
});

await asUser(userX, async () => {
  try {
    await db.query(
      `insert into public.journeys (user_id, expected_arrival_at) values ('${userA}', now() + interval '30 minutes')`
    );
    check('X cannot create a journey on behalf of A (should have thrown)', false);
  } catch {
    check('X cannot create a journey on behalf of A', true);
  }
});

await asUser(userG, async () => {
  const seen = await db.query(`select id from public.journeys where id = '${journeyId}'`);
  check('accepted guardian G can see A journey', seen.rows.length === 1);
});

await asUser(userX, async () => {
  const seen = await db.query(`select id from public.journeys where id = '${journeyId}'`);
  check('unrelated X cannot see A journey', seen.rows.length === 0);
});

await asUser(userG, async () => {
  // journeys_update_own's USING clause (user_id = auth.uid()) simply
  // excludes this row from G's UPDATE scan — no exception, just zero rows
  // affected, unlike the alerts table where a guardian is allowed to
  // update status directly.
  const result = await db.query(
    `update public.journeys set status = 'cancelled' where id = '${journeyId}' returning id`
  );
  check(
    'guardian cannot update A journey at all — journeys_update_own is owner-only, unlike alerts',
    result.rows.length === 0
  );
});

await asUser(userA, async () => {
  const updated = await db.query(
    `update public.journeys set expected_arrival_at = now() + interval '45 minutes' where id = '${journeyId}' returning expected_arrival_at`
  );
  check('A (the owner) can update their own journey (e.g. "add time")', updated.rows.length === 1);
});

console.log('\n--- check_overdue_journeys() (journey_overdue -> alerts pipeline) ---');
// What this proves locally: the function correctly identifies overdue,
// not-yet-notified journeys, raises a real alert reusing the existing
// alerts table/pipeline with trigger_type = 'journey_overdue' (proving the
// alert_trigger_type enum extension above actually took effect), carries
// over the journey's last known location, and atomically flips the journey
// to alert_triggered + stamps notified_at so it can never fire twice — all
// exercised via direct invocation, not by waiting on a real schedule.
//
// What this does NOT and CANNOT prove locally: that pg_cron actually
// invokes this function every 2 minutes on a live Supabase project — pglite
// has no pg_cron (confirmed below, same graceful-degradation shape as
// pg_net/Realtime above), so cron.schedule() in the migration silently
// skipped there. Verifying the schedule itself fires needs a real Supabase
// project with pg_cron enabled and a live wait-and-check.
let overdueJourneyId;
let notOverdueJourneyId;
await asUser(userA, async () => {
  const overdue = await db.query(
    `insert into public.journeys (user_id, expected_arrival_at, grace_period_minutes, last_lat, last_lng)
     values ('${userA}', now() - interval '20 minutes', 10, 23.75, 90.39) returning id`
  );
  overdueJourneyId = overdue.rows[0].id;

  const notOverdue = await db.query(
    `insert into public.journeys (user_id, expected_arrival_at, grace_period_minutes)
     values ('${userA}', now() + interval '30 minutes', 10) returning id`
  );
  notOverdueJourneyId = notOverdue.rows[0].id;
});

const alertsBefore = await db.query(
  `select count(*) as n from public.alerts where user_id = '${userA}' and trigger_type = 'journey_overdue'`
);

await db.query(`select public.check_overdue_journeys();`);

const overdueJourneyAfter = await db.query(
  `select status, notified_at from public.journeys where id = '${overdueJourneyId}'`
);
check(
  'overdue journey flipped to alert_triggered with notified_at stamped',
  overdueJourneyAfter.rows[0].status === 'alert_triggered' &&
    overdueJourneyAfter.rows[0].notified_at !== null
);

const notOverdueJourneyAfter = await db.query(
  `select status, notified_at from public.journeys where id = '${notOverdueJourneyId}'`
);
check(
  'not-yet-overdue journey is untouched (still active, notified_at still null)',
  notOverdueJourneyAfter.rows[0].status === 'active' &&
    notOverdueJourneyAfter.rows[0].notified_at === null
);

const journeyAlert = await db.query(
  `select user_id, status, trigger_type, last_lat, last_lng from public.alerts
   where user_id = '${userA}' and trigger_type = 'journey_overdue'
   order by created_at desc limit 1`
);
check(
  "a journey_overdue alert was raised via the existing alerts table, carrying the journey's last known location",
  journeyAlert.rows.length === 1 &&
    journeyAlert.rows[0].status === 'active' &&
    Number(journeyAlert.rows[0].last_lat) === 23.75 &&
    Number(journeyAlert.rows[0].last_lng) === 90.39
);

const alertsAfterFirstRun = await db.query(
  `select count(*) as n from public.alerts where user_id = '${userA}' and trigger_type = 'journey_overdue'`
);
check(
  'exactly one journey_overdue alert exists for the overdue journey after the first run',
  Number(alertsAfterFirstRun.rows[0].n) === Number(alertsBefore.rows[0].n) + 1
);

// Re-running immediately must be a no-op for the journey it already
// claimed — this is the "can never fire twice" guarantee.
await db.query(`select public.check_overdue_journeys();`);

const alertsAfterSecondRun = await db.query(
  `select count(*) as n from public.alerts where user_id = '${userA}' and trigger_type = 'journey_overdue'`
);
check(
  're-running check_overdue_journeys() does not raise a duplicate alert for the same journey',
  Number(alertsAfterSecondRun.rows[0].n) === Number(alertsAfterFirstRun.rows[0].n)
);

console.log('\n--- pg_cron scheduling (journeys.sql) ---');
// Same graceful-degradation shape as the pg_net and Realtime checks above:
// confirms the DO block's exception handler is what actually ran (no
// pg_cron extension present in pglite) rather than the happy path silently
// no-op'ing, and that this never blocked the rest of the migration from
// applying (the journeys table, RLS, and check_overdue_journeys() above all
// exist and work despite pg_cron being unavailable here).
const cronExtensionExists = await db.query(`
  select count(*) as n from pg_extension where extname = 'pg_cron'
`);
check(
  'confirms the graceful-degradation path ran: no pg_cron extension exists in pglite, yet the migration completed and check_overdue_journeys() above works',
  Number(cronExtensionExists.rows[0].n) === 0
);

console.log('\n--- profiles.phone: normalized unique constraint ---');
await asUser(userA, async () => {
  const set = await db.query(
    `update public.profiles set phone = '+1 555-123-4567' where id = '${userA}' returning phone`
  );
  check('A can set their own phone number', set.rows[0].phone === '+1 555-123-4567');
});
await asUser(userG, async () => {
  try {
    // Same digits as A's "+1 555-123-4567", different formatting (a space
    // instead of the dashes) — normalize_phone only strips whitespace and
    // dashes, not the leading "+", so this has to keep the "+" to
    // actually normalize to the same string as what A has stored. Must
    // still collide with A's, proving the unique index is on the
    // normalized value, not the raw column (see the migration's own
    // comment on why a raw-value constraint wouldn't actually prevent
    // this).
    await db.query(`update public.profiles set phone = '+1 5551234567' where id = '${userG}'`);
    check("G cannot reuse A's phone number even with different formatting", false);
  } catch (err) {
    check(
      "G cannot reuse A's phone number even with different formatting",
      /duplicate key|unique constraint/i.test(String(err.message ?? err))
    );
  }
});

console.log('\n--- resolve_login_identifier() ---');
await asAnon(async () => {
  const email = await db.query(`select public.resolve_login_identifier('A@EXAMPLE.COM') as v`);
  // Deliberately mixed-case in the input above: an identifier containing
  // "@" is returned completely unchanged (no normalization at all) — this
  // also confirms the anon grant actually works, not just that the
  // function behaves correctly when called some other way.
  check(
    'resolving an email passes through unchanged (no lookup, no case-folding)',
    email.rows[0].v === 'A@EXAMPLE.COM'
  );

  // A's stored number is '+1 555-123-4567'; this uses a space instead of
  // the dashes — normalize_phone strips both whitespace and dashes (not
  // the leading "+"), so this still has to normalize to the same string
  // as what's stored to prove the lookup actually normalizes rather than
  // requiring an exact match.
  const byPhone = await db.query(`select public.resolve_login_identifier('+1 555 123 4567') as v`);
  check(
    "resolving a real phone (different formatting than what's stored) returns the right email",
    byPhone.rows[0].v === 'a@example.com'
  );

  const missing = await db.query(`select public.resolve_login_identifier('+19998887777') as v`);
  check('resolving a non-existent phone returns NULL', missing.rows[0].v === null);
});

// Confirm the function reveals nothing else about the profile: the only
// thing a caller can ever learn is the single email string (or NULL) it
// returns — never full_name, role, or any other column, regardless of
// how many columns the underlying SELECT inside the function touches.
await asAnon(async () => {
  const result = await db.query(
    `select public.resolve_login_identifier('+1 555 123 4567') as resolve_login_identifier`
  );
  check(
    'resolve_login_identifier returns exactly one column (the email) and nothing else',
    Object.keys(result.rows[0]).length === 1 &&
      Object.keys(result.rows[0])[0] === 'resolve_login_identifier'
  );

  // anon has no direct SELECT grant on profiles/auth.users at all — the
  // only reason the lookup above works is resolve_login_identifier's own
  // SECURITY DEFINER privilege. Confirms there's no separate, broader
  // grant sitting underneath it that anon could exploit directly.
  try {
    await db.query(`select phone from public.profiles where id = '${userA}'`);
    check('anon has no direct SELECT access to profiles (only via the function)', false);
  } catch (err) {
    check(
      'anon has no direct SELECT access to profiles (only via the function)',
      /permission denied/i.test(String(err.message ?? err))
    );
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
