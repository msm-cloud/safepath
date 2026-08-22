-- Backend half of SOS alert notifications: whenever a new alert row is
-- inserted, queue an HTTP call (via pg_net) to the send-alert-email Edge
-- Function, which looks up the user's accepted guardians and emails them.
-- No mobile/dashboard UI in this migration — trigger + Edge Function only.

-- 1. pg_net lets a Postgres trigger make outbound HTTP calls. Supabase
-- hosted projects usually have this enabled already; guard it anyway so
-- this migration is self-contained on a fresh project.
--
-- Wrapped in a DO block with an exception handler rather than a bare
-- `create extension if not exists pg_net;` — IF NOT EXISTS only guards
-- against the extension already being installed, not against the
-- extension being unavailable at all on this Postgres instance (e.g. the
-- pglite-based local test suite, which doesn't bundle pg_net). Without
-- this, applying this migration in that environment would hard-fail here
-- and never even reach the trigger below. The trigger function itself is
-- already written to degrade to a warning, never an error, if net.http_post
-- turns out not to exist when it actually fires — see below.
do $$
begin
  execute 'create extension if not exists pg_net';
exception
  when others then
    raise notice
      'pg_net extension could not be enabled (%). Expected in environments without pg_net available (e.g. the local pglite test suite) — alerts_notify_guardians_on_insert degrades to a warning instead of failing when this happens.',
      sqlerrm;
end
$$;

-- 2. MANUAL SETUP REQUIRED — not done by this migration, on purpose.
--
-- The trigger below authenticates to the Edge Function with the project's
-- service_role key, read at call-time from Supabase Vault. This migration
-- file is committed to git, so it must never contain the real key value —
-- not even as a "temporary" placeholder, since a placeholder committed here
-- could accidentally end up live. Instead, run this ONCE yourself, outside
-- of any migration, via the SQL editor in the Supabase dashboard (or `psql`
-- against the project directly) — never commit it to a file:
--
--   select vault.create_secret(
--     '<your project''s service_role key, from Project Settings > API>',
--     'edge_function_auth',
--     'service_role key used by alerts_notify_guardians_on_insert to call send-alert-email'
--   );
--
-- Until that secret exists, the trigger below detects its absence, logs a
-- warning, and otherwise does nothing — it will NOT fail or block the
-- alert insert itself (see the exception handling below).

-- 3. Trigger function: fires after every new alert, and best-effort queues
-- a call to send-alert-email. Guardian notification is important but must
-- never be allowed to block or fail an SOS alert being recorded — that
-- would be actively dangerous — so every failure mode here is caught and
-- downgraded to a warning rather than propagated.
create or replace function public.notify_guardians_on_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_role_key text;
  -- pg_net has no way to ask Postgres its own external HTTPS project URL —
  -- that's platform-level, not stored in the database — so this has to be
  -- hardcoded per project. If this project is ever relinked to a different
  -- Supabase project, update this. (The project ref itself isn't secret;
  -- it's already public in every client request this app makes.)
  v_project_url constant text := 'https://njeqiynkyjftlfhodqce.supabase.co';
begin
  begin
    select decrypted_secret
      into v_service_role_key
      from vault.decrypted_secrets
      where name = 'edge_function_auth'
      limit 1;

    if v_service_role_key is null then
      raise warning
        'notify_guardians_on_alert: Vault secret "edge_function_auth" not set — guardians were NOT notified for alert %. See the setup note in supabase/migrations/20260822153852_alert_guardian_notification_trigger.sql.',
        new.id;
    else
      perform net.http_post(
        url := v_project_url || '/functions/v1/send-alert-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object('alert_id', new.id)
      );
    end if;
  exception
    when others then
      -- Covers a missing/misconfigured pg_net, network issues, etc. —
      -- deliberately swallowed for the reason explained above.
      raise warning
        'notify_guardians_on_alert: failed to queue guardian notification for alert % — %',
        new.id, sqlerrm;
  end;

  return new;
end;
$$;

create trigger alerts_notify_guardians_on_insert
  after insert on public.alerts
  for each row
  execute function public.notify_guardians_on_alert();
