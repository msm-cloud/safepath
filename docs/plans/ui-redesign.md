# Plan: UI redesign

Status: mobile redesign merged; the web dashboard and the cleanup are still to do.
Design boards: `docs/design/safepath-ui/`. Theme and components: see
`docs/ARCHITECTURE.md`.

## Merged

- Foundation: design tokens and base components (#71)
- Welcome and auth screens (#74)
- PR 1: settings and secondary screens (#80, plus follow-ups)
- PR 2: home screens (#91); welcome, auth and onboarding completion (#98)
- PR 3: safety-critical screens (#97)
- PR 4: fake call setup with in-app ringing (#107)
- Keyboard fix for form screens under a navigation header (#110)

## Remaining

- PR 5: web dashboard redesign, in four parts. Styling only: no changes to Supabase
  queries, auth, RLS, API routes, migrations or page text.
  - 5a: tokens, fonts, `<html lang>`, base components and `/dev/ui-gallery`.
  - 5b: public pages (sign-in, sign-up, forgot and reset password, guardian-only, landing,
    privacy and terms; legal text unchanged).
  - 5c: dashboard shell and overview (alerts, live sharing, past alerts, invite form,
    recorded location, linked people). The sidebar label reuses `dashboardTitle`.
  - 5d: settings.
- Follow-up after 5d: an EN/বাংলা switch on the signed-out pages (sign-in, sign-up, password
  reset, guardian-only). They have none today and always start in Bangla, because the
  language comes from the signed-in profile. Signed-out visitors' choice would have to be
  kept without a profile (for example a cookie the root layout reads).
- PR 6: cleanup (below).

### PR 6 cleanup

Checked against `main` at 789c2d5:

- Delete `mobile/constants/Colors.ts`. Nothing on `main` imports it any more. Check the
  uncommitted `Colors.ts` edits in the `diag/locdebug-live-sharing` checkout first, so
  nothing in them is lost.
- Delete `mobile/components/useColorScheme.ts` and `useColorScheme.web.ts` once nothing
  imports them. They are still used by `theme/useTheme.ts` and `app/_layout.tsx`, so those
  have to move to React Native's `useColorScheme` first (the wrappers map `unspecified`
  to light, and the web one always returns light).
- Remove the unused `empty` value from `ScreenBackground` in
  `mobile/theme/backgrounds.ts`. Empty states take no photo (decided 2026-10-08, see
  "Background photos" in `docs/ARCHITECTURE.md`).

## Deferred, not part of the redesign

The Test SOS screen and the fake call delay options wait for Tier A push and background
ringing; see `fake-call-and-test-sos.md`.
