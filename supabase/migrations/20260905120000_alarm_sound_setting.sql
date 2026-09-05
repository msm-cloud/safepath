-- Guardian-side preference for SOS alert alarms: whether a new active alert
-- plays looping sound + repeating haptics on THIS guardian's own device (see
-- mobile/app/(guardian)/index.tsx and dashboard/app/dashboard/active-alerts.tsx).
-- The full-screen flash those same screens add is unconditional — this
-- column only gates the audible/vibration parts.
--
-- Lives on the same shared public.profiles table as shake_sos_enabled /
-- fake_call_enabled (see 20260825194207_safety_feature_settings.sql), for
-- the same account-portability reasoning — but unlike those two, which are
-- read for role = 'user' (at-risk/student) rows, this one is read and
-- written ONLY for role = 'guardian' rows. It is deliberately NOT the
-- at-risk user's own setting: whether a guardian's phone makes noise when
-- THEY receive someone else's alert is that guardian's own device
-- preference to control, not something the person the alert is about
-- should be deciding on the guardian's behalf. Meaningless (and never
-- read/written) for role = 'user' rows.
--
-- Defaults to on, like fake_call_enabled — an SOS alert is exactly the kind
-- of notification nobody should have to opt into hearing; this is an
-- opt-out, not an opt-in.
alter table public.profiles
  add column alarm_sound_enabled boolean not null default true;

comment on column public.profiles.alarm_sound_enabled is
  'Guardian-only device preference: whether a new SOS/missed-checkin alert plays looping sound + repeating haptics on this guardian''s own device. The screen flash is unconditional and not gated by this column. Meaningless for role = ''user'' rows — this is the guardian receiving the alert deciding for their own device, never the at-risk user deciding on the guardian''s behalf.';

-- No RLS change needed — profiles_update_own (20260821190552_profiles.sql)
-- is a plain "id = auth.uid()" policy with no column restrictions, same as
-- shake_sos_enabled/fake_call_enabled before it.
