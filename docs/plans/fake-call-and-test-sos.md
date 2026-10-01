# Plan: fake call setup, Test SOS and SOS PIN

Status: agreed design, not built. Design boards: `User-FakeCallSetup`, `User-TestAlert`,
`User-Home` and `User-SOS` in `docs/design/safepath-ui/`.

## Build order

1. PR 2: welcome and auth screens
2. PR 3: invites
3. Tier A push (FCM delivery to guardians, full-screen alarm, `safepath-push` native module)
4. Fake call setup and Test SOS
5. SOS PIN (separate feature, see below)

Fake call setup and Test SOS come after Tier A push: they reuse its native notification
module, and Test SOS can only report "delivered" once guardians receive pushes while the
app is closed.

### Persona

PR 2's welcome screen asks for a persona (student, working woman or guardian) but stores
only the role: guardian creates a guardian account, the other two a user account, and the
persona only changes wording on the signed-out screens. Onboarding will ask for the persona
again and store it in a new nullable `profiles.persona` column (numbered migration,
regenerated shared types). The onboarding step shows a one-line reason for asking, for
example "So SafePath can suggest the right safety features for your day".

## Fake call setup

### Screen and settings

- The setup screen picks the caller (Ammu, Abbu or another name), when it rings (now,
  30 s, 1 min, 5 min) and whether it rings out loud or only vibrates.
- The home "Fake call" tile opens the setup screen.
- The caller-name field in Safety features is removed. This retires the keyboard-loop
  problem in issue #29 for that field; the new "Other name" input must be checked for the
  same problem on a development build before #29 is closed.
- The `fake_call_enabled` toggle stays in Safety features and still hides the home tile.

### Data

- `profiles.fake_call_caller_name` keeps the last "Other name". No migration: an existing
  value from the old Settings field is already in this column.
- When the setup screen opens, a saved name that equals the Ammu or Abbu label in either
  language selects that choice; any other saved name selects "Other name" with the name
  filled in. With nothing saved, Ammu is selected.
- Choosing Ammu or Abbu does not clear the saved other name.
- The last caller choice, delay and ring mode are device preferences in AsyncStorage.

### Ringing in the background

Inexact alarms (`set`, `setAndAllowWhileIdle`) may fire up to an hour late on Android 12+,
and `setWindow` has a 10-minute minimum window, so neither fits a 30 s to 5 min delay.
JS timers stop when the app is in the background, which is why the current 10 s and 30 s
delays do not ring on a locked phone.

| Delay       | Mechanism                                                                  | Permission                                  |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| Now         | Show the call immediately                                                  | None                                        |
| 30 s, 1 min | `shortService` foreground service that counts down and then posts the call | None (limit about 3 minutes)                |
| 5 min       | Exact alarm (`setExactAndAllowWhileIdle`)                                  | `SCHEDULE_EXACT_ALARM`, granted by the user |

- The countdown notification is posted the moment the call is scheduled and is discreet:
  neutral text ("SafePath is running · 0:42", with **Cancel**), no caller name and no
  mention of a call, so someone glancing at the phone cannot tell a call is coming. It
  uses `VISIBILITY_SECRET` so nothing shows on the lock screen. Cancel stops the service
  or cancels the alarm. For the exact-alarm path this is a plain ongoing notification with
  the same text.
- The `shortService` foreground service is only ever started from the setup screen, by
  the user tapping Schedule, while the app is in the foreground. Android's restrictions on
  starting a foreground service from the background therefore do not apply. Nothing
  starts it from a broadcast, alarm, push or boot receiver; the 5 min path uses the
  exact alarm instead.
- 5 min without exact-alarm access: the setup screen explains why and links to the
  "Alarms & reminders" setting. If the user declines, the 5 min option stays disabled with
  a one-line reason. It never falls back to an inexact alarm, because a call that rings
  minutes late is worse than no call.
- Not used: `USE_EXACT_ALARM` (Play allows it only for alarm, timer and calendar apps) and
  a `specialUse` foreground service (needs a Play Console justification for a single
  option).
- The exact-alarm path listens for
  `ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED` and checks
  `canScheduleExactAlarms()` before each schedule.

### The call

- A `CallStyle.forIncomingCall` notification on one of two channels, "Fake call: ring"
  (ringtone, `FLAG_INSISTENT` so it repeats) and "Fake call: vibrate" (vibration only).
  Android fixes a channel's sound when it is created, so ring mode picks the channel.
- Two delivery paths, both first-class and both tested on every build:
  - **Heads-up ringing** (no full-screen intent access): the notification shows as a
    heads-up that keeps ringing until answered or declined; tapping it opens the call
    screen after unlock. This is a primary path, not a fallback: Play may reject the
    full-screen intent declaration, and many users will refuse the permission, so it must
    be convincing on its own.
  - **Full-screen** (with access): the call screen opens over the lock screen like a real
    call.
- The call screen never shows SafePath. The notification header does show the app name;
  that cannot be hidden.

### Full-screen intent permission

- Play auto-grants `USE_FULL_SCREEN_INTENT` on Android 14+ only to calling and alarm
  apps. SafePath is neither, so the permission is declared and the user grants it.
- Ask in context, once: the first time the user schedules a fake call (and in Tier A
  guardian setup). Check `NotificationManager.canUseFullScreenIntent()`; if false, show a
  short explanation and a button that opens
  `Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT`.
- If refused: use the heads-up path above, note it on the setup screen, and do not ask
  again unless the user taps the note.
- If Play rejects the declaration, remove `USE_FULL_SCREEN_INTENT` from the manifest and
  ship with heads-up ringing only (see the open point below).

### Open point: `CallStyle` without full-screen intent

Android only accepts a `CallStyle` notification that belongs to a foreground service or
carries a full-screen intent. The 30 s and 1 min calls are posted from the `shortService`,
so they qualify. The "Now" and 5 min calls have no foreground service, so without
`USE_FULL_SCREEN_INTENT` they fit neither. Options, to decide before building:

- Post every call from a short foreground service. "Now" is started by the user in the
  foreground, so that is allowed; the 5 min exact alarm grants a brief window to start a
  foreground service from the alarm receiver, which must be checked on Android 14+.
- Fall back to a high-priority, insistent notification without `CallStyle` on those paths.
  It looks less like a real call.

### Device test matrix

Run on the Galaxy S23 Ultra and the Infinix, on a locked and an unlocked phone, for each
delay (now, 30 s, 1 min, 5 min) and ring mode:

- Heads-up path (full-screen intent access off): rings until answered or declined, keeps
  ringing with the screen off, answer and decline both work.
- Full-screen path (access on): call screen opens over the lock screen.
- Countdown notification: no caller name or call wording, nothing shown on the lock
  screen, Cancel stops the call on both the `shortService` and exact-alarm paths.

### Play Console declarations

- Full-screen intent declaration: "Other" core functionality (personal safety: guardian
  SOS alarms and the user-started fake call). This is not eligible for auto-grant, so the
  app relies on the in-app request above.
- `SCHEDULE_EXACT_ALARM`: no declaration (user-granted special access). Do not declare
  `USE_EXACT_ALARM`.
- Foreground service: `shortService` needs no type-specific declaration. The existing
  location service declaration is unchanged.

### Files

- `mobile/app/(tabs)/index.tsx` (home tile and current fake call code), new setup and
  call screens, `mobile/components/SafetyFeaturesScreen.tsx`, `mobile/lib/translations.ts`,
  `mobile/lib/user-settings-context.tsx`
- `mobile/modules/safepath-push` (from Tier A): channels, call notification, countdown
  service, exact alarm
- No database migration.

## Test SOS

### Rule

A test must never create a real alert. Tests live in their own tables; nothing that reads
`alerts` (student SOS screen, guardian home and past alerts, dashboard, `send-alert-email`,
journeys cron) is changed, so a missed check means a test does not show, never that it
shows as a real alert.

### Flow

1. The user starts a test from the home status line.
2. The app checks location, SMS backup and the location permission, then inserts a
   `sos_tests` row.
3. A trigger creates one `sos_test_receipts` row per accepted guardian and sends a test
   push through the Tier A sender.
4. Guardians see a card marked **TEST** ("Munshi tested SOS. No action needed."): no
   buttons, no alarm sound, no vibration, no flash overlay. The push uses a separate
   low-importance "SafePath tests" channel with no sound and no full-screen intent.
5. The guardian app sets `delivered_at` when it receives the test (push handler or
   Realtime) and `seen_at` when the card is opened or dismissed.
6. The test screen follows the receipts over Realtime.

### Checklist

| Row           | Source                                                                             | Shown                                                                    |
| ------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Location      | `getBestEffortLocation()`                                                          | Found, with accuracy. Coordinates are not stored.                        |
| Each guardian | `sos_test_receipts`                                                                | Sent, delivered or seen                                                  |
| SMS backup    | Shared check with the real SOS path: contacts present and `SMS.isAvailableAsync()` | "3 contacts ready · not sent in a test". `sendSMSAsync` is never called. |
| Email         | None                                                                               | "Not sent in a test". No email is sent for tests.                        |
| End with PIN  | Hidden until the SOS PIN exists                                                    |                                                                          |

- A guardian with no delivery after 2 minutes shows "Not delivered to Abbu yet. Their
  phone may be offline, notifications may be off, or SafePath isn't set up there. Ask
  them to open SafePath." The row keeps updating if the receipt arrives later.
- A guardian with no registered device shows "Can't reach Abbu's phone" straight away.
  The user cannot read guardians' `push_tokens`, so the trigger records this as
  `failure_reason`.
- With no accepted guardians, the screen says so and offers the invite flow.

### Location permission warning

- Foreground granted and background not granted (`getBackgroundPermissionsAsync()`): the
  "While using the app" warning from the board, with a link to the app settings.
- Also warn when only approximate location is allowed or location services are off
  (`hasServicesEnabledAsync()`).

### Database (migrations to write when this is built)

1. `sos_tests`: `id`, `user_id`, `created_at`, `location_found`, `sms_backup_ready`.
   RLS: the owner inserts and reads; accepted guardians read. Added to Realtime.
2. `sos_test_receipts`: `test_id`, `guardian_id`, `sent_at`, `delivered_at`, `seen_at`,
   `failure_reason`. RLS: the test owner reads; a guardian reads and updates only their
   own row, and a trigger limits that update to `delivered_at` and `seen_at`. Added to
   Realtime.
3. Insert trigger on `sos_tests`: creates receipts, rate-limits tests per user per hour,
   queues the test push.
4. Cron job that deletes tests older than 30 days.
5. Regenerate `packages/shared-types`.

RLS tests: a test creates no `alerts` row, an unlinked guardian cannot see a test, and a
guardian cannot change another guardian's receipt.

### Files

- New test screen and guardian TEST card; `mobile/lib/sos-trigger.ts` (extract the SMS
  backup check), `mobile/app/(guardian)/index.tsx` (second subscription),
  `mobile/lib/translations.ts`, `supabase/tests/rls.test.mjs`
- Unchanged by design: every reader of `alerts` and `send-alert-email`.

## SOS PIN (separate feature)

To be planned on its own. Scope agreed so far:

- Set the PIN during onboarding (and later in Safety features).
- Forgotten PIN: reset path that does not let someone holding the phone end an active SOS.
- Attempt limits and lockout behaviour.
- Use on the real SOS screen: "I am safe · end SOS with PIN".

Open questions for that plan: where the PIN is verified (device or server), whether a
duress PIN that appears to end the SOS but keeps guardians alerted is in scope, and what a
guardian sees when the PIN is entered wrong.

Until it exists, Test SOS hides the "End with PIN" row.

## References

- [Schedule alarms (Android)](https://developer.android.com/develop/background-work/services/alarms/schedule)
- [Exact alarms denied by default on Android 14](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)
- [Foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [Full-screen intent requirements (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/13392821)
- [Permissions and APIs that access sensitive information (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/16558241)
