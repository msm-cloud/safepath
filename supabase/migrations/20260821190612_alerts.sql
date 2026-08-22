-- alerts: an SOS alert raised by a user, visible to their accepted guardians.
-- Schema-only migration: no application code reads/writes this table yet.

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.alert_status not null default 'active',
  trigger_type public.alert_trigger_type not null default 'manual',
  last_lat double precision,
  last_lng double precision,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index alerts_user_id_idx on public.alerts (user_id);

alter table public.alerts enable row level security;

-- The owning user has full read/write access to their own alerts.
create policy "alerts_insert_own"
  on public.alerts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "alerts_select_own_or_accepted_guardian"
  on public.alerts
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = alerts.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

-- Both the owner and an accepted guardian can update; the trigger below
-- restricts a guardian's update to the status column only.
create policy "alerts_update_own_or_accepted_guardian"
  on public.alerts
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = alerts.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = alerts.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

grant select, insert, update on public.alerts to authenticated;

-- Row-level security can restrict *which rows* a guardian may update, but not
-- *which columns* — that needs this trigger. A guardian may only flip status
-- (e.g. to mark an alert resolved); the owner can change anything.
create or replace function public.enforce_alert_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  is_accepted_guardian boolean;
begin
  is_owner := old.user_id = auth.uid();

  if not is_owner then
    is_accepted_guardian := exists (
      select 1
      from public.guardian_links gl
      where gl.user_id = old.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    );

    if not is_accepted_guardian then
      raise exception 'not authorized to update this alert';
    end if;

    if new.user_id is distinct from old.user_id
      or new.trigger_type is distinct from old.trigger_type
      or new.last_lat is distinct from old.last_lat
      or new.last_lng is distinct from old.last_lng
      or new.created_at is distinct from old.created_at
    then
      raise exception 'guardians may only update the status of an alert';
    end if;
  end if;

  if new.status in ('resolved', 'false_alarm') and old.status = 'active' then
    new.resolved_at := now();
  end if;

  return new;
end;
$$;

create trigger alerts_enforce_update_permissions
  before update on public.alerts
  for each row
  execute function public.enforce_alert_update_permissions();
