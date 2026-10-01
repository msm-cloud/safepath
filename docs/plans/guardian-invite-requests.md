# Plan: guardian invite requests (PR 3b)

Status: draft for review, not built. Design boards: `Guardian-Invite`, `User-InviteAccept`,
`User-Guardians` and `User-RemoveGuardian` in `docs/design/safepath-ui/`.

## Why

Today the student creates a code and the guardian who enters it is linked at once. The
student never sees who used the code, and an old code never expires. The boards turn this
around: the guardian creates a short-lived code, and the student enters it, sees who is
asking and what they will be able to see, and accepts or declines. Linking always ends with
the student's explicit choice.

PR 3 already added `revoke_guardian_link`, the no-reactivation rule,
`sos_recipient_guardian_ids` and the live drop on the guardian's side; 3b builds on them.

## Flow

1. The guardian opens **Invite a family member** and creates a code (8 characters, shown as
   `K7Q9 2MXZ` like PR 3's codes). They share or copy it. The screen lists their codes still waiting, each with
   **Cancel**, and **Create another code**.
2. The student opens **Guardians → Have an invite code?** and enters it.
3. If the code is valid, the student sees the review screen: the guardian's name and photo,
   the code and the last two digits of the guardian's phone, what the guardian will be able
   to do, and the line "Don't know this person, or someone is pressuring you? Decline."
4. **Accept** creates an accepted `guardian_links` row. **Decline** ends the request.
5. If the student leaves the review screen without deciding, the request stays on their
   Guardians tab as "Ammu wants to be your guardian · Review".
6. The student's **Invite guardian** button shares a message asking the family member to
   install SafePath and send a code. It creates nothing in the database.

## Rules

- **Expiry**: a code expires 24 hours after it is created (the board's `[EXPIRY]`; decided
  2026-10-01). Expired
  codes can't be looked up; a cron job marks them expired and deletes requests older than
  30 days.
- **Single use**: the first student who looks up a valid code claims it. No one else can
  look it up afterwards, and it can only be accepted or declined by that student.
- **Codes**: 8 characters from the same 32-symbol alphabet as today's invite codes
  (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, about 1.1 trillion codes), generated with
  `gen_random_bytes`. The board shows 6; 8 was kept (decided 2026-10-01). Lookup ignores
  spaces, dashes and case.
- **Attempt limits** (same table and pattern as `auth_rate_limit_events`):
  - Student lookups: 5 failed lookups per 15 minutes and 20 per day per account. Not
    found, expired, cancelled and already claimed all return the same error, so a code's
    state can't be probed.
  - Guardian codes: at most 3 waiting codes at once and 10 created per day.
- **One link per pair**: accepting when the pair already has an accepted link does nothing
  and reports success. A revoked link stays revoked; accepting creates a new row.
- **Role checks**: only guardians create codes, only users look them up, and nobody can
  claim their own code.

## What the guardian is told

- **Waiting**: "Waiting to accept · Code K7Q 92M · created 9:10 PM".
- **Declined, expired or cancelled**: all show the same neutral "Code no longer active",
  so a guardian can't tell a decline from an expiry. This protects a student who is being
  pressured.
- **Accepted**: the student appears in the guardian's list. Once Tier A push exists, the
  guardian may get "{name} accepted your invite"; nothing is sent for a decline.
- **Removed (revoked)**: as in PR 3, the student disappears from the guardian's screens
  with no message, name or reason.

## Database (numbered migrations)

1. `guardian_requests`: `id`, `guardian_id`, `code` (unique while active), `status`
   (`waiting`, `claimed`, `accepted`, `declined`, `cancelled`, `expired`), `created_at`,
   `expires_at`, `claimed_by`, `claimed_at`, `decided_at`. RLS: the guardian reads their
   own requests; the claiming student reads the request they claimed. No direct client
   writes; everything goes through the functions below.
2. Functions (security definer, fixed `search_path`, `anon` revoked):
   - `create_guardian_request()`: guardian only, enforces the limits, returns the code.
   - `cancel_guardian_request(p_request_id)`: the guardian, while waiting or claimed.
   - `claim_guardian_request(p_code)`: user only, rate limited, returns the guardian's
     name, avatar path, phone ending and the request id.
   - `accept_guardian_request(p_request_id)` and `decline_guardian_request(p_request_id)`:
     the claiming student only.
3. Cron: expire and purge.
4. Realtime: add `guardian_requests` so the guardian's waiting list and the student's
   Guardians tab update live.
5. Regenerate `packages/shared-types`.

## Older apps (1.1 and 1.2)

Installed apps still create codes from the student side and redeem them from the guardian
side. Keep `redeem_guardian_invite`, the student `guardian_links` insert policy, and a small
"Have a code from an older SafePath?" entry on the guardian's Invite screen. Remove them
when PostgREST logs show no `/rest/v1/rpc/redeem_guardian_invite` calls for 30 days and the
minimum supported app version is 1.3 or later (the same signal used for the
`resolve_login_identifier` removal).

## RLS tests

- Only guardians can create codes; limits apply; a user can't create one.
- A user can claim a valid code; a second user can't; the guardian can't claim their own.
- Expired, cancelled and unknown codes give the same error; the failed-lookup limit
  blocks the 6th failure in 15 minutes.
- Only the claiming student can accept or decline; accept creates one accepted link;
  accepting again doesn't duplicate it; a revoked link isn't reactivated.
- The guardian sees only their own requests; the student sees only what they claimed.
- After a decline, the guardian sees the same state as after an expiry.
- `redeem_guardian_invite` still works for codes created the old way.

## Screens and files

- Guardian: new Invite screen (`Guardian-Invite`), replacing the redeem-only `link.tsx`
  apart from the older-app entry.
- Student: Guardians tab gains "Have an invite code?" and claimed-request cards; new review
  screen (`User-InviteAccept`). Removal stays as in PR 3.
- Dashboard: the redeem form (`dashboard/app/dashboard/redeem-invite-form.tsx`) and its
  strings are removed; guardians create codes in the mobile app (decided 2026-10-01).
- `mobile/lib/translations.ts`, `supabase/tests/rls.test.mjs`, docs.

## Open questions

1. Should a student be able to turn off "requests by code" entirely (for example, under
   pressure at home)?

Decided 2026-10-01: 24-hour expiry, 8-character codes, dashboard redeem form removed.
