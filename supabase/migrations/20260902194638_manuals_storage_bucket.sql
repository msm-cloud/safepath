-- BACKFILL migration: this bucket and policy were created directly on the
-- remote project (via the Supabase Dashboard's Storage UI, not through a
-- committed migration) on 2026-09-02 to host SafePath_User_Manual.pdf,
-- linked from the welcome/sign-in/sign-up screens (see #50). That gap
-- between actual remote state and git was only discovered when this
-- migration's own version number (20260902194638, taken from the bucket's
-- real created_at) showed up as an untracked entry in the remote's
-- migration history while validating an unrelated PR (#51) — confirmed via
-- the Supabase Management API, not assumed. `supabase migration repair
-- --status reverted 20260902194638` cleared that stale tracking-table
-- entry (bookkeeping only — it never touched the actual bucket/policy) so
-- this file could be added the normal way instead.
--
-- Every statement below is written to match what's already live in
-- production byte-for-byte, and to be safe to apply anywhere it ISN'T
-- already live (a fresh `supabase start` local stack, or a different
-- environment) — this is backfilling documentation of an existing change,
-- not introducing a new one.

-- PUBLIC, deliberately (public = true): a single shared user manual PDF,
-- not per-user content — unlike avatars/, nothing here is sensitive, and a
-- world-readable URL is exactly what a "linked from every sign-in screen,
-- including to someone who isn't signed in yet" manual needs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'manuals',
  'manuals',
  true,
  10485760, -- 10 MiB — comfortably covers a PDF user guide
  array['application/pdf']
)
on conflict (id) do nothing;

-- RLS on storage.objects is already enabled by Supabase. Scoped to
-- bucket_id = 'manuals', so this doesn't affect any other bucket.
--
-- Wrapped in a DO block with an exception handler (same pattern as the
-- pg_net extension guard in 20260822153852_alert_guardian_notification_trigger.sql)
-- rather than a bare `create policy`, which has no IF NOT EXISTS in
-- Postgres — needed here specifically because this policy already exists
-- live; without the guard, applying this migration to the actual linked
-- project would fail with "policy already exists" instead of being the
-- no-op a backfill migration should be.
do $$
begin
  create policy "manuals_public_read"
    on storage.objects
    for select
    to public
    using (bucket_id = 'manuals');
exception
  when duplicate_object then
    raise notice 'manuals_public_read already exists — expected when backfilling this migration onto the project it was written from; not expected on a fresh environment.';
end
$$;
