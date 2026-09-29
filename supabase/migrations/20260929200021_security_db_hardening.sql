-- Database security hardening. No client changes are needed: every insert
-- into guardian_links and every profiles update the mobile app and
-- dashboard send already fits inside the new rules.
--
-- 1. guardian_links INSERT is pending-only, and clients may only supply
--    user_id/status. Before this, the owner could insert a row that was
--    already accepted by any guardian_id of their choosing, skipping
--    redemption and that guardian's consent. anon loses its table grants.
-- 2. redeem_guardian_invite rejects self-redeem and non-guardian callers,
--    and anon can no longer call it.
-- 3. profiles.role can't be changed by API callers after sign-up.
-- 4. Invite codes come from gen_random_bytes instead of random().
-- 5. Cron workers and trigger functions are no longer callable over the
--    API. pg_cron runs them as postgres (their owner), and Postgres doesn't
--    check EXECUTE when a trigger fires, so both keep working.
-- 6. normalize_phone gets a fixed search_path.

-- 1. guardian_links INSERT
drop policy "guardian_links_insert_own" on public.guardian_links;

create policy "guardian_links_insert_own"
  on public.guardian_links
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and guardian_id is null
    and status = 'pending'
    and accepted_at is null
  );

-- invite_code, guardian_id and accepted_at always come from defaults or
-- from redeem_guardian_invite, never from the client.
revoke insert on public.guardian_links from authenticated;
grant insert (user_id, status) on public.guardian_links to authenticated;

-- anon has no policies here, so RLS already denied everything; drop the
-- table grants it inherited from the platform defaults anyway.
revoke all on public.guardian_links from anon;

-- 2. redeem_guardian_invite: same generic error for self-redeem and
-- non-guardian callers, so neither case reveals that the code exists.
create or replace function public.redeem_guardian_invite(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.guardian_links%rowtype;
  v_user_name text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
    into v_link
    from public.guardian_links
   where invite_code = p_invite_code
     and status = 'pending'
     and guardian_id is null
   for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'invalid_or_used_code');
  end if;

  if v_link.user_id = auth.uid() then
    return jsonb_build_object('success', false, 'error', 'invalid_or_used_code');
  end if;

  if (select role from public.profiles where id = auth.uid()) is distinct from 'guardian' then
    return jsonb_build_object('success', false, 'error', 'invalid_or_used_code');
  end if;

  update public.guardian_links
     set guardian_id = auth.uid(),
         status = 'accepted',
         accepted_at = now()
   where id = v_link.id
     and status = 'pending'
     and guardian_id is null;

  select full_name
    into v_user_name
    from public.profiles
   where id = v_link.user_id;

  return jsonb_build_object(
    'success', true,
    'user_id', v_link.user_id,
    'user_name', v_user_name
  );
end;
$$;

-- 20260821192936 only revoked from public; anon still had an explicit
-- grant from the platform defaults.
revoke execute on function public.redeem_guardian_invite(text) from anon;

-- 3. Role lock. A trigger rather than column privileges: both sign-up flows
-- (mobile sign-up.tsx, dashboard auth-actions.ts) send role in their
-- profiles UPDATE with the same value handle_new_user already set, which
-- must keep working. service_role/postgres can still fix a role by hand.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Deliberately not security definer: current_user must be the API
  -- caller's role, not the function owner.
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') then
    raise exception 'profiles.role cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_role_immutable
  before update of role on public.profiles
  for each row
  execute function public.prevent_profile_role_change();

-- 4. Crypto-random invite codes. The alphabet has 32 characters and 32
-- divides 256, so byte % 32 is unbiased.
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea;
  new_code text;
begin
  loop
    b := extensions.gen_random_bytes(8);
    select string_agg(substr(chars, (get_byte(b, i) % 32) + 1, 1), '' order by i)
      into new_code
      from generate_series(0, 7) as i;
    exit when not exists (select 1 from public.guardian_links where invite_code = new_code);
  end loop;
  return new_code;
end;
$$;

-- authenticated keeps EXECUTE: the invite_code column default runs as the
-- inserting user.
revoke execute on function public.generate_invite_code() from public, anon;

-- 5. Not callable over the API. Revoking from public as well as anon/
-- authenticated, since functions get EXECUTE for PUBLIC by default.
revoke execute on function public.check_overdue_journeys() from public, anon, authenticated;
revoke execute on function public.purge_old_live_locations() from public, anon, authenticated;
revoke execute on function public.purge_expired_location_history() from public, anon, authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_guardian_link_update() from public, anon, authenticated;
revoke execute on function public.enforce_alert_update_permissions() from public, anon, authenticated;
revoke execute on function public.notify_guardians_on_alert() from public, anon, authenticated;
revoke execute on function public.enforce_live_sharing_session_write() from public, anon, authenticated;
revoke execute on function public.enforce_location_history_retention_write() from public, anon, authenticated;
revoke execute on function public.prevent_profile_role_change() from public, anon, authenticated;

-- 6. normalize_phone only calls pg_catalog functions, so an empty
-- search_path is enough.
alter function public.normalize_phone(text) set search_path = '';
