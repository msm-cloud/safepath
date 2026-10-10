# Plan: UI redesign

Status: the visual redesign is complete. The only original goal still open is 3b, guardian
invite requests (plan #89, `guardian-invite-requests.md`), which is not started.
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
- PR 5a: dashboard tokens, fonts and base components (#114)
- PR 5b: dashboard public pages (#115)
- PR 5c: dashboard shell and overview (#116)
- PR 5d: dashboard settings and the `[userId]` placeholder (#119)
- Follow-up to PR 5: an EN/বাংলা switch on the signed-out pages (#124, e431c7e)
- PR 6: cleanup (this PR, below)

Related fix, outside the redesign steps: the locked dashboard alarm sound can no longer be
missed (#125, c1f1750, closes #118).

## Remaining

- 3b: guardian invite requests (plan #89), not started.

### PR 6 cleanup (done)

Checked against `main` at 1c76089:

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
