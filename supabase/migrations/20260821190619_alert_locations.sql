-- alert_locations: a trail of location pings recorded while an alert is
-- active. Append-only from the client's point of view (no update/delete
-- policies).
-- Schema-only migration: no application code reads/writes this table yet.

create table public.alert_locations (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);

create index alert_locations_alert_id_idx on public.alert_locations (alert_id);

alter table public.alert_locations enable row level security;

-- The alert's owning user (checked via the parent alert's user_id) can
-- record and read location pings for their own alert.
create policy "alert_locations_insert_own"
  on public.alert_locations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.alerts a
      where a.id = alert_locations.alert_id
        and a.user_id = auth.uid()
    )
  );

create policy "alert_locations_select_own_or_accepted_guardian"
  on public.alert_locations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.alerts a
      where a.id = alert_locations.alert_id
        and a.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.alerts a
      join public.guardian_links gl on gl.user_id = a.user_id
      where a.id = alert_locations.alert_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

grant select, insert on public.alert_locations to authenticated;
