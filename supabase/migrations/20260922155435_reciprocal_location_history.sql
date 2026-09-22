-- Reciprocal location sharing, phase 2: lets a guardian record their own
-- location history for a linked student to view, additive to the existing
-- student -> guardian direction from 20260910155342_location_history.sql.
--
-- location_history_points already has everything it needs on the write
-- side (INSERT policy is just user_id = auth.uid(), so either role can
-- already write their own points) and needs only a new, additive SELECT
-- policy for the reverse read direction — the existing
-- location_history_points_select_owner_or_guardian_in_window policy is
-- untouched; Postgres ORs both policies together per SELECT.
--
-- location_history_retention gets a recorded_by_role discriminator
-- (reusing profile_role rather than a new type, since that's exactly the
-- semantic needed) instead of overloading its existing user_id/guardian_id
-- columns with flipped meaning. Existing rows backfill to 'user' via the
-- column default, which is their correct, unchanged meaning. The primary
-- key widens to (user_id, guardian_id, recorded_by_role) so a link pair
-- can hold one retention setting per direction.

-- 1. location_history_retention: direction discriminator + widened PK.
-- Must come before the new points policy below, since that policy
-- references recorded_by_role.
alter table public.location_history_retention
  add column recorded_by_role public.profile_role not null default 'user';

comment on column public.location_history_retention.recorded_by_role is
  'Which role''s points this retention row governs: ''user'' (default, unchanged) = the student''s points kept by the guardian; ''guardian'' = the guardian''s points kept by the student. Reuses profile_role rather than a new type since that is exactly the semantic needed.';

alter table public.location_history_retention
  drop constraint location_history_retention_pkey,
  add primary key (user_id, guardian_id, recorded_by_role);

-- 2. New reverse-direction SELECT policy on location_history_points.
create policy "location_history_points_select_user_reads_guardian_in_window"
  on public.location_history_points
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.guardian_links gl
      where gl.guardian_id = location_history_points.user_id
        and gl.user_id = auth.uid()
        and gl.status = 'accepted'
        and location_history_points.recorded_at >= now() - (
          coalesce(
            (select r.retention_hours
               from public.location_history_retention r
              where r.user_id = gl.user_id
                and r.guardian_id = gl.guardian_id
                and r.recorded_by_role = 'guardian'),
            24
          ) * interval '1 hour'
        )
    )
  );

-- 3. Pin recorded_by_role as immutable, alongside the existing identity
-- columns — it is part of the row's identity now, same as user_id/guardian_id.
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
      or new.recorded_by_role is distinct from old.recorded_by_role
      or new.created_at is distinct from old.created_at
    then
      raise exception 'location_history_retention.user_id, guardian_id, recorded_by_role, and created_at cannot be changed';
    end if;
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- 4. purge_expired_location_history(): the original only ever matched
-- p.user_id against retention.user_id, so a guardian-owned point (whose
-- user_id only ever appears in retention.guardian_id, recorded_by_role =
-- 'guardian') would always fall back to the 24h default regardless of what
-- retention was actually set for that direction. greatest() ignores NULLs
-- and only returns NULL if both sides are NULL, so this degrades to the
-- original behavior for a 'user'-role point and mirrors it for a
-- 'guardian'-role point.
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
      greatest(
        (select max(r.retention_hours)
           from public.location_history_retention r
          where r.user_id = p.user_id
            and r.recorded_by_role = 'user'),
        (select max(r.retention_hours)
           from public.location_history_retention r
          where r.guardian_id = p.user_id
            and r.recorded_by_role = 'guardian')
      ),
      24
    ) * interval '1 hour'
  );
end;
$$;
