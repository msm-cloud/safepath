-- New, additive-only migration (does not modify any existing migration or
-- policy): the mobile guardian-invite screen needs to show a linked
-- guardian's full_name to the at-risk user, once accepted. The existing
-- profiles policies only allow the reverse direction
-- (profiles_select_by_accepted_guardian, added in the guardian_links
-- migration, lets a guardian see the user's profile) — there was no
-- symmetric policy letting the user see their own accepted guardian's
-- profile. This adds exactly that, and nothing else.

create policy "profiles_select_by_own_guardian"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.guardian_links gl
      where gl.guardian_id = profiles.id
        and gl.user_id = auth.uid()
        and gl.status = 'accepted'
    )
  );
