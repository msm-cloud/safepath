-- Fix: a guardian reading a student's location_history_points fails with
-- "more than one row returned by a subquery used as an expression" (21000)
-- once the pair holds a retention row for each direction.
--
-- location_history_points_select_owner_or_guardian_in_window (from
-- 20260910155342_location_history.sql) looks up the guardian's retention
-- with a scalar subquery keyed on (user_id, guardian_id) only. That was
-- unique until 20260922155435_reciprocal_location_history.sql widened the
-- location_history_retention PK to (user_id, guardian_id, recorded_by_role);
-- as soon as the student also sets a 'guardian'-role retention for the same
-- pair, the subquery returns two rows and the guardian's whole SELECT errors.
--
-- Recreated unchanged except that the retention lookup is now scoped to
-- recorded_by_role = 'user' — the direction this policy governs (the
-- student's own points, kept by the guardian) — mirroring the
-- recorded_by_role = 'guardian' filter in the reverse-direction policy.
drop policy "location_history_points_select_owner_or_guardian_in_window"
  on public.location_history_points;

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
                and r.guardian_id = gl.guardian_id
                and r.recorded_by_role = 'user'),
            24
          ) * interval '1 hour'
        )
    )
  );
