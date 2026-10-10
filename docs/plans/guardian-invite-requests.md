# Plan: guardian invite requests (PR 3b)

Status: backend (3b-1) built; app screens (3b-2) not built yet. Design boards: `Guardian-Invite`, `User-InviteAccept`,
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
   `K7Q9 2MXZ` like PR 3's codes). They share or copy it. The screen lists their codes still
   waiting, each with **Cancel**, and **Create another code**.
2. The student opens **Guardians → Have an invite code?** and enters it.
3. If the code is valid, the student sees the review screen: the guardian's name and photo,
   the code and the last two digits of the guardian's phone, what the guardian will be able
   to do, and the line "Don't know this person, or someone is pressuring you? Decline."
   - **Photo**: shown from a signed URL that lasts about 10 minutes (see
     `claim-guardian-request` below). If there is no photo, or the URL has expired because
     the screen was left open, the screen shows the placeholder avatar. It never shows a
     broken image.
   - **Phone**: `profiles.phone` is optional. With no phone on file, the phone line is left
     out. It never shows a placeholder like "··".
4. **Accept** creates an accepted `guardian_links` row. **Decline** ends the request.
5. If the student leaves the review screen without deciding, the request stays on their
   Guardians tab as "Ammu wants to be your guardian · Review" until it expires (24 hours
   after the guardian created the code).
6. The student's **Invite guardian** button shares a message asking the family member to
   install SafePath and send a code. It creates nothing in the database.

## Rules

- **Expiry**: a request expires at its `expires_at`, 24 hours after the code was created
  (the board's `[EXPIRY]`; decided 2026-10-01). This covers every open state: a waiting
  code, a claimed request the student never decides on, and, on the guardian's side, a
  declined request (see below). Expired codes can't be looked up; a cron job marks
  requests expired and deletes requests older than 30 days.
- **Single use**: the first student who looks up a valid code claims it. No one else can
  look it up afterwards, and it can only be accepted or declined by that student.
- **Codes**: 8 characters from the same 32-symbol alphabet as today's invite codes
  (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, about 1.1 trillion codes), generated with
  `gen_random_bytes`. The board shows 6; 8 was kept (decided 2026-10-01). Lookup ignores
  spaces, dashes and case.
- **Attempt limits**:
  - Student lookups: 5 failed lookups per 15 minutes and 20 per day per account. Not
    found, expired, cancelled and already claimed all return the same error, so a code's
    state can't be probed. Only failures count, recorded in `auth_rate_limit_events` (see
    Database).
  - Guardian codes: at most 3 codes the guardian sees as waiting at once, and 10 created
    per day (counted from `guardian_requests.created_at`, so no rate-limit bucket is
    needed).
- **One link per pair**: accepting when the pair already has an accepted link does nothing
  and reports success. A revoked link stays revoked; accepting creates a new row.
- **Role checks**: only guardians create codes, only users look them up, and nobody can
  claim their own code.

## What the guardian sees

The guardian never reads `guardian_requests` directly. They get each request's `id`,
`code`, `created_at` and one combined state, through `list_guardian_requests()`:

| Raw status                                                        | Guardian state |
| ----------------------------------------------------------------- | -------------- |
| `waiting`, `claimed`                                              | waiting        |
| `declined`, before `expires_at`                                   | waiting        |
| `declined` after `expires_at`, `accepted`, `cancelled`, `expired` | inactive       |

`claimed_by`, `claimed_at`, `decided_at`, `expires_at` and the raw status never reach the
guardian.

- **Waiting**: "Waiting to accept · Code K7Q9 2MXZ · created 9:10 PM".
- **Declined**: shows "waiting" until its normal `expires_at`, then turns inactive at the
  same moment an unused code would. It also keeps counting toward the 3-code cap until
  then, because freeing the slot early would give the decline away. Otherwise a code
  created at 9:10 PM that went inactive at 9:14 PM, without the guardian cancelling it,
  could only mean a decline.
- **Inactive**: "Code no longer active", the same wording whatever the reason. This
  protects a student who is being pressured.
- **Accepted**: the code turns inactive and the student appears in the guardian's list.
  Once Tier A push exists, the guardian may get "{name} accepted your invite". Nothing is
  sent for a decline.
- **Removed (revoked)**: as in PR 3, the student disappears from the guardian's screens
  with no message, name or reason.

### Keeping the guardian's list fresh

The guardian has no SELECT on the table, so `postgres_changes` can't reach them. 3b uses
neither a broadcast channel nor polling. The app re-fetches `list_guardian_requests()`
when:

- the Invite screen gains focus, or the app comes back to the foreground;
- a `guardian_links` INSERT arrives for `guardian_id = me`. The guardian already has
  Realtime on `guardian_links` from PR 3 (today only UPDATE is subscribed, in
  `use-guardian-link-revoked`). 3b adds an INSERT listener;
- a local timer fires at the earliest waiting code's `created_at + 24 h`;
- the guardian creates or cancels a code (their own action).

**Why this is enough:** a code the guardian sees goes from waiting to inactive in only
three ways: the guardian's own action, expiry, or an accept. An accept always creates a
`guardian_links` row. Expiry is fixed at 24 hours after creation, which the client already
knows. A decline changes nothing the guardian can see, by design. A broadcast channel
would need private channels and RLS on `realtime.messages`, which nothing in the repo uses
yet. Polling would add constant requests for no new information.

Edge case: if the pair is already linked, an accept changes nothing in `guardian_links`.
The code then goes inactive on the next focus or refresh, which is fine.

## Database (numbered migrations)

1. `guardian_requests`: `id`, `guardian_id`, `code` (unique while active), `status`
   (`waiting`, `claimed`, `accepted`, `declined`, `cancelled`, `expired`), `created_at`,
   `expires_at`, `claimed_by`, `claimed_at`, `decided_at`. RLS:
   - **Guardian**: no SELECT, INSERT, UPDATE or DELETE policy. All reads and actions go
     through the functions below.
   - **Student**: SELECT on rows where `claimed_by = auth.uid()`, whatever the status, so
     a cancel or expiry still reaches the Guardians tab over Realtime (Realtime checks an
     UPDATE against the new row). The app shows only claimed, unexpired rows (decided
     2026-10-10).
   - No direct client writes for anyone.
2. Functions (security definer, fixed `search_path`, `anon` revoked):
   - `create_guardian_request()`: guardian only. It enforces the 3-at-once cap (counting
     every request the guardian sees as waiting, including declined ones before expiry)
     and the 10-per-day limit, and returns the code.
   - `list_guardian_requests()`: guardian only. Returns `id`, `code`, `created_at` and
     `state` (`waiting` or `inactive`) as mapped above, for the last 7 days.
   - `cancel_guardian_request(p_request_id)`: guardian only. It works on any request the
     guardian sees as waiting, and sets the status to `cancelled`, which also clears a
     claimed request from the student's tab. It returns the same result whether the raw
     status was waiting, claimed or declined.
   - `claim_guardian_request(p_student_id, p_code)`: **service role only** (execute
     revoked from `authenticated`). Called by the Edge Function below, never by the app
     directly. It checks the role and the limits, claims the code, and returns the request
     id, the guardian's name, `avatar_url` path and phone ending (or null).
   - `get_claimed_guardian_request(p_student_id, p_request_id)`: **service role only**.
     Returns the same details again so the student can re-open the review screen, but only
     for the claiming student while the request is claimed and unexpired; otherwise one
     generic error. Not counted as a lookup (decided 2026-10-10).
   - `list_my_guardian_requests()`: the student's open requests (`id`, guardian name,
     `created_at`, `expires_at`) for the Guardians tab cards (decided 2026-10-10).
   - `accept_guardian_request(p_request_id)` and `decline_guardian_request(p_request_id)`:
     the claiming student only, and only while `now() < expires_at`.
3. Edge Function `claim-guardian-request` (same pattern as `auth-identifier`). It verifies
   the student's JWT and calls `claim_guardian_request` with the admin client, passing the
   student's id. If the guardian has a photo, it signs the avatar path with
   `createSignedUrl(path, 600)`. It returns the request id, name, phone ending and signed
   URL (or null), so the storage path never reaches the app. The avatar storage policy
   (`avatars_select_own_or_linked`) is not changed. Called with `{ requestId }` instead of
   a code, it uses `get_claimed_guardian_request` and returns the same details with a fresh
   signed URL.
4. Lookup limits in `auth_rate_limit_events`:
   - Widen the `bucket` CHECK constraint (today `ip`, `signin`, `reset`) to add
     `invite_lookup`.
   - `auth_rate_limit_hit()` records every call, but only failed lookups should count. Add
     a check-only path and a record-on-failure step. `claim_guardian_request` takes the
     same per-key `pg_advisory_xact_lock`, checks the count, attempts the claim, and
     records an event only on failure, all in one transaction. That way parallel lookups
     can't slip past the limit. The existing 24-hour purge already covers the daily
     window.
5. Cron: expire and purge.
6. Realtime: add `guardian_requests` to the publication for the **student's** Guardians
   tab only. The student's SELECT policy limits which rows they receive. The guardian
   isn't affected (see "Keeping the guardian's list fresh").
7. Regenerate `packages/shared-types`.

## Older apps (1.1 and 1.2)

Installed apps create codes on the student side and redeem them on the guardian side.
After 3b ships, the old flow keeps working on the server for one release cycle, so users
in both directions can still link while they update:

- **Server**: keep `redeem_guardian_invite`, the student `guardian_links` insert policy and
  old-style code creation. From the separate #77 PR onward, old codes expire after 24
  hours too.
- **Old student app + new guardian app**: the guardian's Invite screen keeps a small "Have
  a code from an older SafePath?" entry that redeems an old code.
- **New student app + old guardian app**: the student's Guardians tab keeps a small
  "Guardian has an older SafePath?" entry that creates an old-style code. Without it, a
  guardian on 1.1/1.2 couldn't link to a student on the new app until the guardian
  updated.
- **Dashboard**: the redeem form goes away in 3b. In its place, web-only guardians see a
  short message (EN/BN) telling them to install the mobile app and link from there.

**Removal milestone**: remove the server path, both older-app entries and the student
insert policy in the first release **after** the one that ships 3b. Removal also waits
until PostgREST logs show no `/rest/v1/rpc/redeem_guardian_invite` calls for 30 days (the
same signal used for the `resolve_login_identifier` removal). If calls continue, removal
moves to a later release. Track this as its own issue when 3b merges.

## RLS tests

- Only guardians can create codes; the 3-at-once and 10-per-day limits apply; a user
  can't create one.
- A user can claim a valid code; a second user can't; the guardian can't claim their own;
  `authenticated` can't call `claim_guardian_request` directly.
- Expired, cancelled and unknown codes give the same error; the failed-lookup limit
  blocks the 6th failure in 15 minutes; successful lookups don't count; parallel failed
  lookups can't exceed the limit.
- Only the claiming student can accept or decline, and not after `expires_at`; accept
  creates one accepted link; accepting again doesn't duplicate it; a revoked link isn't
  reactivated.
- The guardian has no direct SELECT on `guardian_requests` (a raw select returns no
  rows); `list_guardian_requests()` returns only their own requests and only `id`, `code`,
  `created_at` and `state`.
- After a decline, `list_guardian_requests()` still returns `waiting` until `expires_at`
  and then `inactive`, exactly as for an unused code; the declined request still counts
  toward the 3-code cap until then.
- `cancel_guardian_request` returns the same result for waiting, claimed and declined
  requests.
- A claimed request the student never decides on expires at `expires_at` and leaves the
  student's tab.
- The student sees only requests they claimed and that are still open.
- `redeem_guardian_invite` still works for codes created the old way, including codes
  created from the new student app's older-app entry.

## Screens and files

- Guardian: new Invite screen (`Guardian-Invite`), replacing the redeem-only `link.tsx`
  apart from the older-app entry. `use-guardian-link-revoked` (or a sibling hook) gains
  the `guardian_links` INSERT listener.
- Student: Guardians tab gains "Have an invite code?", claimed-request cards and the
  older-app code entry; new review screen (`User-InviteAccept`) with the placeholder
  avatar fallback and the optional phone line. Removal stays as in PR 3.
- Dashboard: the redeem form (`dashboard/app/dashboard/redeem-invite-form.tsx`) and its
  strings are removed and replaced by the "link from the mobile app" message; guardians
  create codes in the mobile app (decided 2026-10-01).
- `supabase/functions/claim-guardian-request/`.
- `mobile/lib/translations.ts`, `supabase/tests/rls.test.mjs`, docs.

## Protection under pressure

There is no switch to turn off requests by code (decided 2026-10-01). A request only
reaches the student when the student enters the guardian's code themselves, so unsolicited
requests can't happen. If a student is pressured into accepting, they are protected by
quiet removal: PR 3's `revoke_guardian_link` drops the guardian with no notification,
name or reason. A declined request also looks to the guardian exactly like an unused code
(see "What the guardian sees").

## Out of scope

- **Delay before a new link goes live**: deferred to its own issue (decided 2026-10-03).
  Open questions there: what happens to alerts during the delay (whether an SOS reaches
  the not-yet-live guardian), and whether the guardian is told the link is pending.
- **Duress PIN**: stays parked under "Is a duress PIN in scope?" in
  `fake-call-and-test-sos.md` (decided 2026-10-03).
- **Issue #77 (old codes never expire)**: a small separate PR now switches the old flow to
  24-hour expiry. #77 is closed when 3b's removal milestone retires the old flow.

Decided 2026-10-01: 24-hour expiry, 8-character codes, dashboard redeem form removed, no
switch to turn off requests by code. Decided 2026-10-03: guardian reads and cancels only
through functions with two states; declines stay waiting until expiry and keep counting
toward the cap; signed photo URL (about 10 minutes) from the `claim-guardian-request` Edge
Function; the old flow is kept for one release cycle in both directions, with a removal
milestone.
