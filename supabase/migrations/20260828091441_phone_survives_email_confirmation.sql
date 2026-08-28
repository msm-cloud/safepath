-- Real bug, not just a documented edge case: with "Confirm email" on
-- (now permanently the case for this project), supabase.auth.signUp()
-- never returns a session, so the app's post-signup profiles UPDATE
-- (sign-up.tsx / auth-actions.ts, which is where phone was set —
-- see 20260828063528_phone_login_and_password_reset.sql) never runs.
-- Every signup since then has left profiles.phone permanently NULL, with
-- no codepath that ever runs that UPDATE again later. Confirmed via
-- direct SQL query against a real signup.
--
-- role/full_name/preferred_language don't have this problem because
-- handle_new_user() already reads them from signup metadata at INSERT
-- time, independent of whether a session exists afterward. This
-- migration gives phone the same treatment — with one deliberate
-- difference: a duplicate phone number must not fail account creation.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := new.raw_user_meta_data ->> 'phone';
begin
  insert into public.profiles (id, role, full_name, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'user')::public.profile_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'bn')::public.preferred_language
  );

  if v_phone is not null then
    begin
      update public.profiles set phone = v_phone where id = new.id;
    exception when unique_violation then
      -- profiles_phone_normalized_key: someone else already has this
      -- exact phone number (normalized). This is exactly the case the
      -- original phone-login migration's own notes flagged as a risk of
      -- doing this in the trigger: if it were allowed to propagate, the
      -- whole signUp() call would fail with a generic wrapped auth error
      -- instead of a specific, catchable one. Catching it narrowly here
      -- — only this UPDATE, not the INSERT above — means account
      -- creation still succeeds and phone is simply left NULL, exactly
      -- as if this trigger had never tried to set it at all.
      --
      -- This is deliberately not a silent dead end: sign-up.tsx /
      -- auth-actions.ts now check phone availability via
      -- resolve_login_identifier() BEFORE calling signUp() at all, so
      -- this exception branch should only ever fire for the narrow race
      -- where two people submit the same phone number at nearly the
      -- same instant — and SettingsScreen.tsx (mobile) gives anyone
      -- whose phone ended up NULL, for that reason or from signing up
      -- before this fix existed at all, a real path to add/fix it
      -- afterward, with the same duplicate-phone check surfaced as a
      -- normal, visible error.
      null;
    end;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Auto-creates a profiles row for a new auth.users row, reading role/full_name/preferred_language/phone from signup metadata — independent of whether a session exists afterward (see 20260828063528_phone_login_and_password_reset.sql''s notes on why email-confirmation-required projects need this). A duplicate phone number does not fail account creation: only the phone UPDATE is caught and skipped, leaving it NULL for the person to set later (see SettingsScreen.tsx).';
