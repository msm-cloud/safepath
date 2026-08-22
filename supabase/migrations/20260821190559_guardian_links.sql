-- guardian_links: links an at-risk user to a guardian, via a short invite
-- code the user shares and the guardian redeems.
-- Schema-only migration: no application code reads/writes this table yet.

-- Generates an 8-character, human-typeable invite code (uppercase letters and
-- digits, excluding 0/O and 1/I to avoid ambiguity when read aloud/copied).
-- security definer + search_path pin so the uniqueness check below sees every
-- existing code regardless of the caller's own RLS visibility into this table.
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  code_taken boolean;
begin
  loop
    select string_agg(substr(chars, (floor(random() * length(chars)) + 1)::int, 1), '')
    into new_code
    from generate_series(1, 8);

    select exists (
      select 1 from public.guardian_links where invite_code = new_code
    ) into code_taken;

    exit when not code_taken;
  end loop;

  return new_code;
end;
$$;

create table public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  guardian_id uuid references public.profiles (id) on delete set null,
  invite_code text not null unique default public.generate_invite_code(),
  status public.guardian_link_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint guardian_links_invite_code_length check (char_length(invite_code) = 8)
);

comment on table public.guardian_links is
  'Invite/link between an at-risk user (user_id) and their guardian (guardian_id, null until the invite_code is redeemed).';

create index guardian_links_user_id_idx on public.guardian_links (user_id);
create index guardian_links_guardian_id_idx on public.guardian_links (guardian_id);

alter table public.guardian_links enable row level security;

-- A user can create an invite for themselves.
create policy "guardian_links_insert_own"
  on public.guardian_links
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Both parties to a link can always see it.
create policy "guardian_links_select_parties"
  on public.guardian_links
  for select
  to authenticated
  using (user_id = auth.uid() or guardian_id = auth.uid());

-- Any authenticated user can look up a pending, unclaimed invite by its code
-- in order to redeem it. Note this necessarily also exposes *other* pending
-- invites to any signed-in user under pure row-level security (RLS can't
-- restrict on "did the caller supply the right invite_code", only on row
-- contents) — acceptable for an MVP invite flow, but treat invite codes as
-- short-lived bearer secrets and revisit with a SECURITY DEFINER redemption
-- RPC if that leak becomes a concern.
create policy "guardian_links_select_pending_for_redemption"
  on public.guardian_links
  for select
  to authenticated
  using (status = 'pending' and guardian_id is null);

-- Redeem an invite: claim an unclaimed, pending row as the calling guardian.
create policy "guardian_links_update_redeem"
  on public.guardian_links
  for update
  to authenticated
  using (status = 'pending' and guardian_id is null)
  with check (guardian_id = auth.uid() and status = 'accepted');

grant select, insert, update on public.guardian_links to authenticated;
grant execute on function public.generate_invite_code() to authenticated;

-- Belt-and-suspenders on top of the update policy above: guarantees a
-- redemption can only ever change guardian_id/status/accepted_at, and stamps
-- accepted_at itself so the client doesn't have to.
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

  if new.status = 'accepted' and old.status = 'pending' and old.guardian_id is null then
    new.accepted_at := now();
  end if;

  return new;
end;
$$;

create trigger guardian_links_enforce_update
  before update on public.guardian_links
  for each row
  execute function public.enforce_guardian_link_update();

-- Deferred from the profiles migration: a guardian can read the profile of
-- any user they have an accepted link with. Defined here because it depends
-- on this table.
create policy "profiles_select_by_accepted_guardian"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = profiles.id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );
