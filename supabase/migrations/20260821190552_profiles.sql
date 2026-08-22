-- profiles: one row per auth.users row, holding app-level profile data.
-- Schema-only migration: no application code reads/writes this table yet.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.profile_role not null,
  full_name text not null,
  phone text,
  preferred_language public.preferred_language not null default 'bn',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'App-level profile for an auth.users row. Created automatically by the handle_new_user trigger below — never insert into this table directly.';

alter table public.profiles enable row level security;

-- A user can read and update only their own profile.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- A guardian can read the profile of any user they have an accepted
-- guardian_links row with. That policy is created in the guardian_links
-- migration instead of here, since guardian_links doesn't exist yet at this
-- point in migration order (it references profiles via foreign key).

-- No insert/delete policy: rows are created only by the trigger below (which
-- runs as security definer, bypassing RLS) and are never deleted directly —
-- they disappear via `on delete cascade` when the auth.users row is removed.

grant select, update on public.profiles to authenticated;

-- Auto-create a profiles row whenever a new auth.users row is inserted.
-- role/full_name can be supplied via the signup call's user metadata
-- (`options.data`); that wiring is added in a later, application-code step.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'user')::public.profile_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'bn')::public.preferred_language
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
