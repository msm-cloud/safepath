-- live location sharing: consent-based, student/worker-controlled live
-- location. The at-risk user toggles a session on; while it's active their
-- device pushes location points every ~12s, and their accepted guardians
-- (via guardian_links) can watch those points arrive over Realtime. Toggle
-- off and the guardian's view goes dark immediately — there is no covert
-- mode, and no location history surfaced to guardians beyond the current
-- position: the guardian SELECT policy on live_locations only matches rows
-- of a *currently active* session, and a pg_cron job purges points older
-- than 2h regardless.
--
-- Structurally this mirrors the existing alerts / alert_locations pair
-- (see 20260821190612_alerts.sql and 20260821190619_alert_locations.sql):
-- a parent row owned by a user, a child ping table, INSERT gated by parent
-- ownership, SELECT gated by "parent owner OR accepted guardian". No
-- SECURITY DEFINER RPC is needed here (unlike redeem_guardian_invite) —
-- every rule below is expressible as a plain RLS predicate, the same way
-- alerts/journeys already do it.

-- 1. Sessions. One row per toggle-on (append-style, like alerts/journeys),
-- never reused — the partial unique index below still guarantees at most
-- one *active* session per user at a time.
--
-- Deviations from a bare schema, all deliberate:
--   * user_id references public.profiles(id), not auth.users(id) — every
--     domain table in this schema (alerts, journeys, guardian_links,
--     emergency_contacts) references profiles(id); staying consistent.
--   * is_active is NOT NULL — the enforce trigger below branches on
--     old.is_active / new.is_active and a three-valued boolean there would
--     just be a latent bug.
create table public.live_sharing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_active boolean not null default false,
  started_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.live_sharing_sessions is
  'One consent-based live-location-sharing session per toggle-on by an at-risk user. Accepted guardians can SELECT; only the owner can write. started_at/stopped_at are stamped by the enforce trigger, not the client.';

create index live_sharing_sessions_user_id_idx on public.live_sharing_sessions (user_id);

-- At most one active session per user. Makes the guardian-side query
-- ("the active session for this linked user") unambiguous and closes the
-- toggle-on race where two rapid taps could otherwise create two rows.
create unique index live_sharing_sessions_one_active_per_user
  on public.live_sharing_sessions (user_id)
  where is_active;

-- 2. Location points. Append-only from every client's point of view (no
-- UPDATE/DELETE policy or grant at all) — the only thing that deletes from
-- here is purge_old_live_locations() below, which runs as SECURITY DEFINER.
create table public.live_locations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sharing_sessions (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);

create index live_locations_session_recorded_idx
  on public.live_locations (session_id, recorded_at desc);

-- 3. Stamp started_at / stopped_at from is_active transitions, and pin
-- user_id — same belt-and-suspenders shape as enforce_guardian_link_update
-- and enforce_alert_update_permissions. The client only ever sets
-- is_active; the timestamps are derived here so they can't drift or be
-- back-dated.
create or replace function public.enforce_live_sharing_session_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_active then
      new.started_at := coalesce(new.started_at, now());
    end if;
    return new;
  end if;

  -- UPDATE
  if new.user_id is distinct from old.user_id then
    raise exception 'live_sharing_sessions.user_id cannot be changed';
  end if;

  if new.is_active and not old.is_active then
    new.started_at := now();
    new.stopped_at := null;
  elsif old.is_active and not new.is_active then
    new.stopped_at := now();
  end if;

  return new;
end;
$$;

create trigger live_sharing_sessions_enforce_write
  before insert or update on public.live_sharing_sessions
  for each row
  execute function public.enforce_live_sharing_session_write();

-- 4. RLS.
alter table public.live_sharing_sessions enable row level security;
alter table public.live_locations enable row level security;

-- Sessions: owner writes, owner + accepted guardian read. Same visibility
-- predicate as alerts_select_own_or_accepted_guardian.
create policy "live_sharing_sessions_insert_own"
  on public.live_sharing_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "live_sharing_sessions_update_own"
  on public.live_sharing_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "live_sharing_sessions_select_own_or_accepted_guardian"
  on public.live_sharing_sessions
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = live_sharing_sessions.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

grant select, insert, update on public.live_sharing_sessions to authenticated;

-- Points: a user may INSERT only into their own session, and only while it
-- is still active (mirrors alert_locations_insert_own, plus the is_active
-- gate so a stopped session can't keep accepting pings). SELECT is the
-- session owner (their own points, any session, within the retention
-- window) OR an accepted guardian — but a guardian ONLY while the session
-- is still active. The moment the owner toggles off, the guardian's direct
-- read access to every point of that session is revoked, not just hidden
-- by the app; combined with the 2h purge below this is what actually backs
-- the "no location history for guardians" guarantee.
create policy "live_locations_insert_own_active_session"
  on public.live_locations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.live_sharing_sessions s
      where s.id = live_locations.session_id
        and s.user_id = auth.uid()
        and s.is_active
    )
  );

create policy "live_locations_select_session_owner_or_accepted_guardian"
  on public.live_locations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.live_sharing_sessions s
      where s.id = live_locations.session_id
        and s.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.live_sharing_sessions s
      join public.guardian_links gl on gl.user_id = s.user_id
      where s.id = live_locations.session_id
        and s.is_active
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

grant select, insert on public.live_locations to authenticated;

-- 5. Realtime. The guardian view subscribes to live_locations INSERTs (new
-- points) and live_sharing_sessions UPDATEs (toggle off -> view goes dark).
-- Realtime reuses the RLS policies above, so a guardian only ever receives
-- events for sessions/points they could already SELECT. Same guarded
-- DO-block shape as 20260823145243_enable_realtime_on_alerts.sql — degrades
-- to a notice where there's no supabase_realtime publication (e.g. the
-- pglite test suite).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_sharing_sessions'
  ) then
    execute 'alter publication supabase_realtime add table public.live_sharing_sessions';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_locations'
  ) then
    execute 'alter publication supabase_realtime add table public.live_locations';
  end if;
exception
  when others then
    raise notice
      'Could not add live-sharing tables to the supabase_realtime publication (%). Expected in environments without Postgres logical replication available (e.g. the local pglite test suite).',
      sqlerrm;
end
$$;

-- 6. Auto-cleanup. Points older than 2h are purged every 30 minutes — a
-- guardian only ever needs the latest point of a live session, and the
-- owner only a short trailing window, so retention is deliberately tight.
-- Same guarded pg_cron pattern as check_overdue_journeys in
-- 20260825133138_journeys.sql: enable the extension in a DO block that
-- degrades to a notice, define the worker as SECURITY DEFINER, and schedule
-- it in another guarded DO block. purge runs as SECURITY DEFINER because
-- live_locations intentionally has no client DELETE grant.
do $$
begin
  execute 'create extension if not exists pg_cron';
exception
  when others then
    raise notice
      'pg_cron extension could not be enabled (%). Expected in environments without pg_cron available (e.g. the local pglite test suite) — the purge_old_live_locations() schedule below is skipped instead of failing when this happens.',
      sqlerrm;
end
$$;

create or replace function public.purge_old_live_locations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.live_locations
  where recorded_at < now() - interval '2 hours';
end;
$$;

comment on function public.purge_old_live_locations() is
  'Deletes live_locations points older than 2h. Scheduled every 30 min via pg_cron. Runs as SECURITY DEFINER because live_locations has no client DELETE grant.';

do $$
begin
  perform cron.schedule(
    'purge-old-live-locations',
    '*/30 * * * *',
    'select public.purge_old_live_locations();'
  );
exception
  when others then
    raise notice
      'Could not schedule purge_old_live_locations() via pg_cron (%). Expected wherever pg_cron itself could not be enabled above (e.g. the local pglite test suite) — this is schema/function-only there, with no actual scheduled execution.',
      sqlerrm;
end
$$;
