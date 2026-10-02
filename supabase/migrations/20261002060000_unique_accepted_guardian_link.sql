-- At most one accepted link per (user, guardian) pair.
--
-- redeem_guardian_invite never checked whether the guardian was already
-- linked to the user, so redeeming a second code created a second accepted
-- link. Removing that guardian in the app then revoked only one of the two
-- links: the other kept SOS emails and every guardian policy working, and
-- each alert was emailed twice.
--
-- 1. Revoke duplicate accepted links, keeping the oldest one per pair.
--    Revoked rather than deleted so the history stays.
-- 2. A partial unique index so the database itself refuses a second
--    accepted link for the same pair.
-- 3. redeem_guardian_invite returns 'already_linked' instead of creating a
--    duplicate. A revoked link doesn't count, so linking again after a
--    removal still works.

-- 1. Existing duplicates
update public.guardian_links gl
   set status = 'revoked'
  from (
    select id,
           row_number() over (
             partition by user_id, guardian_id
             order by accepted_at nulls last, created_at, id
           ) as rn
      from public.guardian_links
     where status = 'accepted'
       and guardian_id is not null
  ) ranked
 where gl.id = ranked.id
   and ranked.rn > 1;

-- 2. One accepted link per pair
create unique index guardian_links_one_accepted_per_pair
  on public.guardian_links (user_id, guardian_id)
  where status = 'accepted';

-- 3. Redeem
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
