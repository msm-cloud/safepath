-- emergency_contacts: personal emergency contacts a user maintains, separate
-- from their SafePath guardians.
-- Schema-only migration: no application code reads/writes this table yet.

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index emergency_contacts_user_id_idx on public.emergency_contacts (user_id);

alter table public.emergency_contacts enable row level security;

-- Only the owning user can see or manage their own emergency contacts.
create policy "emergency_contacts_all_own"
  on public.emergency_contacts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.emergency_contacts to authenticated;
