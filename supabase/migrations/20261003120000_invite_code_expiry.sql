-- Invite codes expire 24 hours after they are created (#77).
--
-- A pending code used to stay redeemable until the student cancelled it, so
-- a code shared once in a chat or screenshot kept granting full guardian
-- access for months. 24 hours matches the guardian-request flow planned in
-- docs/plans/guardian-invite-requests.md, which later replaces this one.
--
-- 1. redeem_guardian_invite treats an expired code exactly like an unknown
--    one ('invalid_or_used_code'), so expiry doesn't reveal that a code
--    existed. This alone enforces the expiry, for every app version.
-- 2. expire_guardian_invites() revokes expired pending codes so they drop
--    off the student's "Codes not used yet" list. It runs every 15 minutes
--    and once here, which expires every code already older than 24 hours
--    at deploy time (no grace period: a new code takes one tap).

-- 1. Redeem
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
     and created_at > now() - interval '24 hours'
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

  -- Checked after the generic errors so it only tells a guardian about a
  -- user they already guard. The code stays pending; the user can cancel it.
  if exists (
    select 1
      from public.guardian_links
     where user_id = v_link.user_id
       and guardian_id = auth.uid()
       and status = 'accepted'
  ) then
    return jsonb_build_object('success', false, 'error', 'already_linked');
  end if;

  begin
    update public.guardian_links
       set guardian_id = auth.uid(),
           status = 'accepted',
           accepted_at = now()
     where id = v_link.id
       and status = 'pending'
       and guardian_id is null;
  exception
    -- Two codes from the same user redeemed by the same guardian at once.
    when unique_violation then
      return jsonb_build_object('success', false, 'error', 'already_linked');
  end;

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

-- 2. Expire
create or replace function public.expire_guardian_invites()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.guardian_links
     set status = 'revoked'
   where status = 'pending'
     and guardian_id is null
     and created_at <= now() - interval '24 hours';
$$;

revoke execute on function public.expire_guardian_invites() from public, anon, authenticated;

select public.expire_guardian_invites();

do $$
begin
  perform cron.schedule(
    'expire-guardian-invites',
    '*/15 * * * *',
    'select public.expire_guardian_invites();'
  );
exception
  when others then
    raise notice 'Could not schedule expire_guardian_invites() via pg_cron (%).', sqlerrm;
end
$$;
