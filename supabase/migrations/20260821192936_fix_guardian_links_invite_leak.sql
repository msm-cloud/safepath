-- Patch: guardian_links_select_pending_for_redemption let ANY authenticated
-- user SELECT every pending, unclaimed row — including invite_code — not
-- just the person the code was actually given to. That was flagged as an
-- accepted tradeoff when the table was first created; it isn't one. Close it
-- by removing the client-readable/updatable redemption path entirely and
-- replacing it with a SECURITY DEFINER function that looks up a row by code
-- without ever exposing other rows.
--
-- Does not touch any table other than guardian_links.

-- 1. Drop the leaky SELECT policy (pending rows visible to anyone signed in).
drop policy if exists "guardian_links_select_pending_for_redemption" on public.guardian_links;

-- 2. Drop the RLS-based redemption UPDATE policy — redemption now goes
--    exclusively through redeem_guardian_invite() below, which bypasses RLS
--    as SECURITY DEFINER. No client-side UPDATE path remains on this table.
drop policy if exists "guardian_links_update_redeem" on public.guardian_links;

-- 3. Replace the SELECT policy with exactly one predicate: a user can see a
--    link only if they're one of its two parties. Drop-and-recreate (rather
--    than leaving the existing policy alone) so this migration is a
--    self-contained statement of the final SELECT surface, not something a
--    reader has to reconstruct by diffing against the original migration.
drop policy if exists "guardian_links_select_parties" on public.guardian_links;

create policy "guardian_links_select_parties_only"
  on public.guardian_links
  for select
  to authenticated
  using (user_id = auth.uid() or guardian_id = auth.uid());

-- The table no longer has any client-side UPDATE path.
revoke update on public.guardian_links from authenticated;

-- 4. Redemption RPC: looks up a pending, unclaimed row by invite_code (never
--    exposing any other row), locks it, and claims it for the caller.
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

comment on function public.redeem_guardian_invite(text) is
  'Redeems a guardian_links invite by code for the calling (guardian) user. The only remaining path to accept an invite — replaces the RLS-based update policy dropped above.';

-- 5. Only signed-in users may call this — and nobody else.
revoke all on function public.redeem_guardian_invite(text) from public;
grant execute on function public.redeem_guardian_invite(text) to authenticated;
