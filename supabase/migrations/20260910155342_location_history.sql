-- recorded live location ("location history"): an opt-in, student/worker-
-- controlled trail of coarse location snapshots taken every ~5 minutes
-- while the toggle is on. Separate feature from live location sharing
-- (20260830211751_live_location_sharing.sql), which explicitly scoped
-- history out: live sharing is a real-time "watch me right now" stream
-- purged after 2h, this is a slower, longer-lived breadcrumb trail a
-- guardian can look back over.
--
-- Deliberately NOT covert: exactly like live sharing, the device runs an
-- un-suppressed Android foreground-service notification while recording,
-- and the Home screen shows a persistent "recording is on" banner. The
-- student turns it on and off; a guardian can never enable it.
--
-- Three pieces here:
--   1. profiles.location_history_enabled — the toggle. An account-level
--      preference (survives reinstall / new device), same rationale and
--      storage choice as shake_sos_enabled etc. in
--      20260825194207_safety_feature_settings.sql. profiles_update_own is
--      column-unrestricted so the student can flip it; guardians only have
--      profiles_select_by_accepted_guardian (read), so they cannot.
--   2. location_history_points — append-only snapshots, owned by the
--      student. Structurally the alert_locations / live_locations shape:
--      INSERT gated by ownership, SELECT by "owner OR accepted guardian",
--      no client DELETE grant at all (only the SECURITY DEFINER purge
--      function below deletes).
--   3. location_history_retention — how long each guardian keeps the
--      trail, one row per (student, guardian) pair, editable by EITHER
--      party. 1h..7d, default 24h. The guardian SELECT policy on
--      location_history_points enforces this window at the row level (a
--      guardian physically cannot read a point older than their retention),
--      the same defense-in-depth the is_active gate gives live sharing.
--
-- No Realtime: a 5-minute trail has no real-time value, so — unlike live
-- sharing — these tables are not added to the supabase_realtime
-- publication. The guardian view is a plain fetch-on-focus, like
-- past-alerts.

-- 1. The toggle. Default off — nobody records without opting in.
alter table public.profiles
  add column location_history_enabled boolean not null default false;

comment on column public.profiles.location_history_enabled is
  'Whether the device records a ~5-minute location-history trail. Student-controlled (guardians only have read access to profiles), off by default. Its own background task + foreground-service notification, independent of live sharing.';

-- 2. The trail. Append-only from every client's point of view — no UPDATE
-- or DELETE policy/grant. user_id references profiles(id), like every
-- other domain table in this schema.
create table public.location_history_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);

comment on table public.location_history_points is
  'Opt-in ~5-minute location snapshots recorded while profiles.location_history_enabled is on. Owner writes/reads their own; an accepted guardian reads only points inside that link''s retention window (see location_history_points_select_owner_or_guardian_in_window). No client DELETE — purge_expired_location_history() is the only thing that deletes.';

-- Serves both the guardian trail query (user_id, newest first) and the
-- purge function's per-user scan.
create index location_history_points_user_recorded_idx
  on public.location_history_points (user_id, recorded_at desc);

-- 3. Per-link retention. One row per (student, guardian) pair; either
-- party may create/update it. Keyed on the pair (not guardian_links.id)
-- so the guardian SELECT policy on points — which already joins
-- guardian_links by user_id + guardian_id — can look retention up
-- directly, and so a pair that somehow holds two accepted link rows still
-- has exactly one retention setting.
create table public.location_history_retention (
  user_id uuid not null references public.profiles (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  -- 1 hour .. 7 days. Bounded low so this stays a short breadcrumb trail,
  -- not indefinite tracking; bounded at all so a client can't set a
  -- pathological value.
  retention_hours integer not null default 24 check (retention_hours between 1 and 168),
  -- Which party last changed it — lets the UI show "set by your guardian".
  -- Stamped by the trigger below from auth.uid(), never trusted from the
  -- client.
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, guardian_id)
);

comment on table public.location_history_retention is
  'How long guardian_id keeps user_id''s recorded location trail, in hours (1..168, default 24). Editable by either party to an accepted link. Enforced at the row level by the guardian SELECT policy on location_history_points; purge keeps the per-user maximum across all links.';

-- 4. Stamp updated_at / updated_by and pin the immutable columns —
-- same belt-and-suspenders shape as enforce_guardian_link_update and
-- enforce_live_sharing_session_write. The client only ever sends
-- retention_hours.
create or replace function public.enforce_location_history_retention_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
      or new.guardian_id is distinct from old.guardian_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'location_history_retention.user_id, guardian_id, and created_at cannot be changed';
    end if;
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger location_history_retention_enforce_write
  before insert or update on public.location_history_retention
  for each row
  execute function public.enforce_location_history_retention_write();

-- 5. RLS.
alter table public.location_history_points enable row level security;
alter table public.location_history_retention enable row level security;

-- Points: the owner writes their own.
create policy "location_history_points_insert_own"
  on public.location_history_points
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Points: the owner reads all of their own (within whatever the purge
-- job has kept); an accepted guardian reads only points newer than their
-- link's retention window. coalesce(..., 24) is the default when the pair
-- has no retention row yet. This row-level window is what actually backs
-- "a guardian only sees the last N hours" — it isn't just an app-side
-- filter.
create policy "location_history_points_select_owner_or_guardian_in_window"
  on public.location_history_points
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = location_history_points.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
        and location_history_points.recorded_at >= now() - (
          coalesce(
            (select r.retention_hours
               from public.location_history_retention r
              where r.user_id = gl.user_id
                and r.guardian_id = gl.guardian_id),
            24
          ) * interval '1 hour'
        )
    )
  );

grant select, insert on public.location_history_points to authenticated;

-- Retention: visible and writable to either party of an accepted link for
-- that exact (student, guardian) pair. Plain RLS predicate — no
-- SECURITY DEFINER RPC needed (unlike redeem_guardian_invite, whose rule
-- genuinely can't be expressed row-level). Separate INSERT/SELECT/UPDATE
-- policies so the client's upsert (insert ... on conflict do update)
-- passes both the INSERT WITH CHECK and the UPDATE USING+WITH CHECK.
create policy "location_history_retention_select_parties"
  on public.location_history_retention
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = location_history_retention.user_id
        and gl.guardian_id = location_history_retention.guardian_id
        and gl.status = 'accepted'
        and (gl.user_id = auth.uid() or gl.guardian_id = auth.uid())
    )
  );

create policy "location_history_retention_insert_parties"
  on public.location_history_retention
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = location_history_retention.user_id
        and gl.guardian_id = location_history_retention.guardian_id
        and gl.status = 'accepted'
        and (gl.user_id = auth.uid() or gl.guardian_id = auth.uid())
    )
  );

create policy "location_history_retention_update_parties"
  on public.location_history_retention
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = location_history_retention.user_id
        and gl.guardian_id = location_history_retention.guardian_id
        and gl.status = 'accepted'
        and (gl.user_id = auth.uid() or gl.guardian_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = location_history_retention.user_id
        and gl.guardian_id = location_history_retention.guardian_id
        and gl.status = 'accepted'
        and (gl.user_id = auth.uid() or gl.guardian_id = auth.uid())
    )
  );

grant select, insert, update on public.location_history_retention to authenticated;

-- 6. Auto-cleanup. Each point is kept for the LONGEST retention any of
-- that student's guardians asked for (so toggling one guardian down never
-- destroys data another guardian still wants) — the per-guardian window is
-- applied separately by the SELECT policy above. Default 24h when the
-- student has no retention rows at all. Runs hourly: retention is measured
-- in hours-to-days, so the 30-minute cadence live sharing uses would just
-- be wasted wake-ups here.
--
-- Same guarded pg_cron pattern as purge_old_live_locations /
-- check_overdue_journeys: enable the extension in a DO block that degrades
-- to a notice (pglite has no pg_cron), define the worker SECURITY DEFINER
-- because location_history_points has no client DELETE grant, and schedule
-- it in another guarded DO block.
do $$
begin
  execute 'create extension if not exists pg_cron';
exception
  when others then
    raise notice
      'pg_cron extension could not be enabled (%). Expected in environments without pg_cron available (e.g. the local pglite test suite) — the purge_expired_location_history() schedule below is skipped instead of failing when this happens.',
      sqlerrm;
end
$$;

create or replace function public.purge_expired_location_history()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.location_history_points p
  where p.recorded_at < now() - (
    coalesce(
      (select max(r.retention_hours)
         from public.location_history_retention r
        where r.user_id = p.user_id),
      24
    ) * interval '1 hour'
  );
end;
$$;

comment on function public.purge_expired_location_history() is
  'Deletes location_history_points older than the per-user maximum retention_hours (default 24h when the user has no location_history_retention rows). Scheduled hourly via pg_cron. SECURITY DEFINER because location_history_points has no client DELETE grant.';

do $$
begin
  perform cron.schedule(
    'purge-expired-location-history',
    '0 * * * *',
    'select public.purge_expired_location_history();'
  );
exception
  when others then
    raise notice
      'Could not schedule purge_expired_location_history() via pg_cron (%). Expected wherever pg_cron itself could not be enabled above (e.g. the local pglite test suite) — this is schema/function-only there, with no actual scheduled execution.',
      sqlerrm;
end
$$;
