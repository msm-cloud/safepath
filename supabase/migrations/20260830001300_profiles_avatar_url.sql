-- Optional profile photo for students (role = 'user') and guardians.
-- First slice of the avatar feature: schema only — no application code
-- reads or writes this column yet.
--
-- Stores a PATH into the private `avatars` storage bucket (created in
-- the companion 20260830001400_avatars_storage_bucket.sql migration),
-- e.g. '<uid>/avatar.jpg' — not a full or signed URL. The bucket is
-- private, so the client turns this path into a short-lived signed URL
-- at read time rather than persisting one that would expire. NULL means
-- "no photo set"; the UI falls back to an initials/placeholder avatar.
--
-- Lives on profiles rather than device storage for the same reason
-- preferred_language and the safety-feature settings columns already do
-- (see 20260825194207_safety_feature_settings.sql): it's an
-- account-level detail that should survive a reinstall or device
-- switch, and profiles is already fetched/cached app-wide (see
-- mobile/lib/auth-context.tsx).

alter table public.profiles
  add column avatar_url text;

comment on column public.profiles.avatar_url is
  'Path within the private `avatars` storage bucket to this user''s profile photo, e.g. "<uid>/avatar.jpg". NULL means no photo set. Not a full or signed URL — the client generates a short-lived signed URL from this path at read time.';

-- No RLS change needed on profiles itself: profiles_update_own (see
-- 20260821190552_profiles.sql) is a plain row-level policy with no
-- column restrictions — every column on profiles, this one included, is
-- already covered by "id = auth.uid()" for both USING and WITH CHECK,
-- exactly as with the safety-feature settings columns. Confirmed
-- directly in supabase/tests/rls.test.mjs, not just inferred.
--
-- The cross-user READ paths — an accepted guardian seeing their
-- student's photo, and a student seeing their guardian's — are enforced
-- on storage.objects instead (see the companion storage-bucket
-- migration), mirroring the existing
-- profiles_select_by_accepted_guardian / profiles_select_by_own_guardian
-- pairing so an avatar is visible to precisely the people who can
-- already see that user's full_name.
