-- Enables Realtime (Postgres Changes) delivery for the alerts table, so the
-- dashboard can subscribe to live INSERT/UPDATE events instead of polling.
--
-- This does NOT bypass RLS. Supabase Realtime's Postgres Changes feature
-- evaluates each change against the SAME row-level security policies as a
-- normal SELECT would, using the subscribing client's own role/JWT (see
-- https://supabase.com/docs/guides/realtime/postgres-changes#security).
-- With alerts_select_own_or_accepted_guardian already in place (see
-- supabase/migrations/20260821190612_alerts.sql), a client only receives
-- realtime events for rows they could already SELECT directly: their own
-- alerts, or — for a guardian — an accepted linked user's alerts. An
-- authenticated user with no relationship to the alert's owner receives
-- nothing for it, exactly as a direct SELECT would return nothing.
--
-- Wrapped in a DO block, for two reasons:
--   1. Idempotency: `ALTER PUBLICATION ... ADD TABLE` has no IF NOT EXISTS
--      form and errors if the table is already a member.
--   2. Environments without Postgres logical replication / no
--      `supabase_realtime` publication at all (e.g. the pglite-based local
--      test suite) would otherwise hard-fail this migration outright.
--      Realtime is additive to already-working RLS-gated SELECT/INSERT/
--      UPDATE, not required for the app's core correctness, so — same as
--      the pg_net setup in the alert-notification migration — this
--      degrades to a warning instead of blocking the rest of the schema
--      from applying.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'alerts'
  ) then
    execute 'alter publication supabase_realtime add table public.alerts';
  end if;
exception
  when others then
    raise notice
      'Could not add alerts to the supabase_realtime publication (%). Expected in environments without Postgres logical replication available (e.g. the local pglite test suite).',
      sqlerrm;
end
$$;
