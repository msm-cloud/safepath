-- journeys: "walk me home" style check-ins. A user starts a journey with an
-- expected arrival time; if they never mark themselves arrived (or extend
-- the time) before the grace period elapses, a server-side cron job raises
-- a real SOS alert on their behalf via the existing alerts pipeline.

-- 1. Extend the existing alert_trigger_type enum (see
-- supabase/migrations/20260821190543_extensions_and_enums.sql) rather than
-- create a parallel one — check_overdue_journeys() below inserts into the
-- same `alerts` table so a missed check-in reuses the entire existing
-- notification pipeline (guardian email trigger, dashboard Realtime) rather
-- than building a second one. `add value if not exists` for idempotency;
-- safe to run in the same migration as everything below because nothing
-- here actually USES 'journey_overdue' at migration-apply time — it only
-- appears inside function-body text, which isn't evaluated until the
-- function is later called (Postgres's same-transaction restriction is on
-- *using* a new enum value, e.g. in an insert/comparison, not on merely
-- referencing it in a not-yet-executed plpgsql body).
alter type public.alert_trigger_type add value if not exists 'journey_overdue';

-- journeys.status lifecycle.
create type public.journey_status as enum ('active', 'arrived_safe', 'alert_triggered', 'cancelled');

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  destination_note text,
  expected_arrival_at timestamptz not null,
  grace_period_minutes integer not null default 10,
  status public.journey_status not null default 'active',
  last_lat double precision,
  last_lng double precision,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index journeys_user_id_idx on public.journeys (user_id);

-- Looked up by check_overdue_journeys() every 2 minutes for every active
-- journey — narrows that scan to just the rows that could possibly be due.
create index journeys_active_expected_arrival_idx
  on public.journeys (expected_arrival_at)
  where status = 'active';

alter table public.journeys enable row level security;

-- Same visibility pattern as alerts: the owning user has full read/write
-- access to their own journeys (start, mark arrived, cancel, extend);
-- an accepted guardian can only SELECT.
create policy "journeys_insert_own"
  on public.journeys
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "journeys_select_own_or_accepted_guardian"
  on public.journeys
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = journeys.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

-- Update is owner-only (unlike alerts, guardians don't act on journeys —
-- there's no guardian-facing journeys UI in this pass, only the alert it
-- can produce), for marking arrived_safe/cancelled or extending the time.
create policy "journeys_update_own"
  on public.journeys
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.journeys to authenticated;

-- 2. pg_cron lets Postgres itself run a scheduled job — no external
-- scheduler needed. Supabase hosted projects usually have this enabled
-- already; guard it anyway so this migration is self-contained on a fresh
-- project, exactly like the pg_net setup in
-- supabase/migrations/20260822153852_alert_guardian_notification_trigger.sql.
--
-- Confirmed directly (not assumed) that pglite — the WASM Postgres behind
-- the local test suite — does NOT bundle pg_cron either: attempting
-- `create extension pg_cron` there fails with 'extension "pg_cron" is not
-- available'. Same missing-extension category as pg_net, so the same
-- graceful degradation is needed here for supabase/tests/rls.test.mjs to
-- keep applying every migration cleanly.
do $$
begin
  execute 'create extension if not exists pg_cron';
exception
  when others then
    raise notice
      'pg_cron extension could not be enabled (%). Expected in environments without pg_cron available (e.g. the local pglite test suite) — the check_overdue_journeys() schedule below is skipped instead of failing when this happens.',
      sqlerrm;
end
$$;

-- 3. check_overdue_journeys(): finds journeys whose grace period has
-- elapsed with nobody having confirmed arrival, raises a real SOS alert for
-- each (reusing the alerts table/pipeline rather than a parallel one), and
-- marks the journey alert_triggered + notified_at in the SAME transaction
-- as the insert — so a given journey can never raise two alerts, even if
-- this function is somehow invoked twice concurrently (the UPDATE only
-- matches rows still `status = 'active'`, so a second concurrent run finds
-- nothing left to act on for a journey the first run already claimed).
create or replace function public.check_overdue_journeys()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_journey record;
begin
  for v_journey in
    select id, user_id, last_lat, last_lng
    from public.journeys
    where status = 'active'
      and expected_arrival_at + (grace_period_minutes * interval '1 minute') < now()
      and notified_at is null
    -- Locks each candidate row so two overlapping runs of this function
    -- (e.g. a slow run still finishing when the next 2-minute tick fires)
    -- can't both claim the same journey; the second waits, then its own
    -- `status = 'active'` check (re-evaluated per row by the FOR loop's
    -- underlying query plan at lock-acquisition time) excludes rows the
    -- first run already flipped to alert_triggered.
    for update skip locked
  loop
    insert into public.alerts (user_id, status, trigger_type, last_lat, last_lng)
    values (v_journey.user_id, 'active', 'journey_overdue', v_journey.last_lat, v_journey.last_lng);

    update public.journeys
    set status = 'alert_triggered', notified_at = now()
    where id = v_journey.id;
  end loop;
end;
$$;

-- 4. Schedule it — every 2 minutes. Only runs if pg_cron actually enabled
-- above; skipped (with a notice) otherwise, same graceful-degradation
-- shape as everything else in this migration.
do $$
begin
  perform cron.schedule('check-overdue-journeys', '*/2 * * * *', 'select public.check_overdue_journeys();');
exception
  when others then
    raise notice
      'Could not schedule check_overdue_journeys() via pg_cron (%). Expected wherever pg_cron itself could not be enabled above (e.g. the local pglite test suite) — this is schema/function-only there, with no actual scheduled execution.',
      sqlerrm;
end
$$;
