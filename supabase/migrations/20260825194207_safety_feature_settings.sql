-- Per-user settings for two new mobile safety features: shake-to-trigger
-- SOS and the fake-call escape. Stored as columns on profiles rather than
-- local device storage, for the same reason preferred_language already
-- lives there instead of AsyncStorage: these are account-level
-- preferences, not device-level ones — someone reinstalling the app or
-- switching phones should not silently lose "shake to trigger SOS is on"
-- (or off), since that's a safety-relevant setting, not a cosmetic one.
-- profiles is already fetched/cached app-wide (see mobile/lib/auth-context.tsx),
-- so this reuses existing plumbing rather than introducing a second
-- settings-storage mechanism.

alter table public.profiles
  add column shake_sos_enabled boolean not null default false,
  add column fake_call_enabled boolean not null default true,
  add column fake_call_caller_name text;

comment on column public.profiles.shake_sos_enabled is
  'Whether a detected shake gesture triggers the same SOS flow as the hold button. Defaults to off — nobody should experience this behavior without opting in.';
comment on column public.profiles.fake_call_enabled is
  'Whether the "Fake Call" escape button shows on the Home screen. Defaults to on — it is purely user-initiated (no accidental-trigger risk), but still fully toggleable off.';
comment on column public.profiles.fake_call_caller_name is
  'Display name shown on the fake incoming-call screen. Null means "use the app''s translated default" (e.g. "Mom") rather than baking one language''s default into the schema.';

-- No RLS change needed: profiles_update_own (see
-- supabase/migrations/20260821190552_profiles.sql) is a plain row-level
-- policy with no column restrictions, unlike alerts/guardian_links which
-- use a trigger to additionally restrict *which* columns a non-owner can
-- touch. Every column on profiles — these three included — is already
-- covered by "id = auth.uid()" for both USING and WITH CHECK. Confirmed
-- directly (not just inferred from reading the migration) in
-- supabase/tests/rls.test.mjs, which didn't previously have any profiles
-- UPDATE coverage at all — added there now.
