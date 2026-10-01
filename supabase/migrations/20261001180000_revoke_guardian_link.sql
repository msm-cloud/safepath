-- Lets a user end a guardian link, or cancel an invite code nobody has
-- redeemed yet.
--
-- 1. revoke_guardian_link(p_link_id): only the user on the link (user_id)
--    can call it; it sets status to 'revoked'. Every policy that gives a
--    guardian access (alerts, alert locations, journeys, live sharing,
--    location history, profiles, avatars) already requires
--    status = 'accepted', so access ends with this update.
-- 2. A revoked link can never become pending or accepted again. Linking
--    again needs a new invite code.
-- 3. sos_recipient_guardian_ids(p_user_id): the one place that decides who
--    is told about an SOS outside the app. send-alert-email uses it now and
--    the push sender will use it too.
-- 4. guardian_links joins the Realtime publication so a guardian's app
--    drops a student as soon as the link is revoked. RLS already limits
--    each row to its two parties.

-- 1. Revoke
create or replace function public.revoke_guardian_link(p_link_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  -- One generic error for "not yours", "already revoked" and "no such
  -- link", so the call can't be used to probe other people's links.
  update public.guardian_links
     set status = 'revoked'
   where id = p_link_id
     and user_id = auth.uid()
     and status in ('pending', 'accepted');

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.revoke_guardian_link(uuid) from public, anon;
grant execute on function public.revoke_guardian_link(uuid) to authenticated;

-- 2. No reactivation
create or replace function public.enforce_guardian_link_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id is distinct from new.user_id
    or old.invite_code is distinct from new.invite_code
    or old.created_at is distinct from new.created_at
  then
    raise exception 'user_id, invite_code, and created_at cannot be changed';
  end if;

  if old.status = 'revoked' and new.status is distinct from 'revoked' then
    raise exception 'a revoked guardian link cannot be reactivated';
  end if;

  if new.status = 'accepted' and old.status = 'pending' and old.guardian_id is null then
    new.accepted_at := now();
  end if;

  return new;
end;
$$;

-- 3. SOS recipients
create or replace function public.sos_recipient_guardian_ids(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select gl.guardian_id
    from public.guardian_links gl
   where gl.user_id = p_user_id
     and gl.status = 'accepted'
     and gl.guardian_id is not null;
$$;

-- Server-side only: it would otherwise tell any caller who guards whom.
revoke all on function public.sos_recipient_guardian_ids(uuid) from public, anon, authenticated;
grant execute on function public.sos_recipient_guardian_ids(uuid) to service_role;

-- 4. Realtime. Skipped with a notice where there is no supabase_realtime
-- publication (e.g. the pglite RLS tests), same as the alerts migration.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'guardian_links'
    )
  then
    execute 'alter publication supabase_realtime add table public.guardian_links';
  end if;
exception
  when others then
    raise notice 'Could not add guardian_links to the supabase_realtime publication (%).', sqlerrm;
end
$$;
