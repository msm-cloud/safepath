# Architecture

This document covers the parts of SafePath whose structure is not obvious from the folder
layout. For setup, environment and deployment see the [README](../README.md).

## Mobile theme and UI components

### Layers

```
docs/design/safepath-ui/      design boards (reference only, not built)
        │
mobile/theme/                 tokens: plain values, no React Native views
  colors.ts                   light + dark colour sets (ThemeColors)
  spacing.ts                  spacing scale, radius, fixed sizes
  typography.ts               font families, text variants, Bangla rules
  shadows.ts                  box-shadow strings per scheme
  fonts.ts                    font files + useBrandFonts() for app/_layout.tsx
  backgrounds.ts              ScreenBackground union, photo files, overlays, gradient
  background-sources.ts       require() for each photo (kept out of backgrounds.ts)
  surface-tone.ts             'default' | 'image' context
  useTheme.ts                 picks the set for the current colour scheme
        │
mobile/components/ui/         base components, built only on theme/
        │
mobile/app/**                 screens, built on components/ui/
```

Screens never hard-code colours, font sizes or radii. If a screen needs a value the
tokens do not have, add a token rather than an inline value.

### Colour schemes

`useTheme()` follows the system setting through React Native's `useColorScheme`; an
unknown scheme falls back to light. Light
values come from the design boards. The boards have no dark theme, so the dark set is
derived from the fake call board's surfaces. A few tokens deliberately differ between
schemes in more than brightness:

- `ink` (the main call-to-action fill) is near-black in light mode and near-white in dark
  mode, so `onInk` flips from white to dark.
- `primary` is a lighter indigo in dark mode and `onPrimary` is dark there; white text on
  the lighter indigo would fail contrast.
- `danger` keeps the same red in both schemes because the SOS colour should not change;
  red text on dark surfaces uses the lighter `dangerText` instead.
- Shadows are dropped in dark mode (except the SOS glow); surfaces separate by colour and
  border instead.

`pnpm check:contrast` (`scripts/check-contrast.ts`) checks every pair the components use,
in both schemes, and fails below WCAG AA. It also measures each background photo (see
below).

On web, the scheme follows the browser's `prefers-color-scheme`. The mobile web build is
not shipped anywhere, so check both schemes on a device or simulator.

### Typography and Bangla

Sora and Figtree have no Bengali glyphs. `Text` and `Input` switch to Hind Siliguri when
the app language is Bangla or when the string itself contains Bengali characters (for
example a Bangla name typed while the app is in English). Bangla text gets a 1.6× line
height and no letter spacing so vowel signs and conjuncts are not clipped or split.

Each weight is a separate font family (for example `Figtree_700Bold`) because Android does
not synthesise weights for custom fonts. Styles pick a family instead of setting
`fontWeight`.

Fonts load in `app/_layout.tsx` while the splash screen is visible. If loading fails the
app continues with system fonts rather than staying on the splash screen.

### Background photos

Photos appear only on welcome, auth (sign-in, sign-up, forgot password, reset password) and
onboarding. No screen after sign-in takes one, empty states included: they stay icon and text
(`ui/EmptyState`).

Decided 2026-10-08: empty states get no photo. Almost every empty state sits on an alert or
list screen (guardian home, past alerts, location history, contacts), which already stay
plain, and emergency screens must stay plain and readable. "Auth" covers forgot password and
reset password, which use `auth.webp` like sign-in and sign-up.

`Screen` accepts `background?: ScreenBackground` from `theme/backgrounds.ts`: `welcome`,
`auth`, and one onboarding photo per persona (`onboardingStudent`, `onboardingWorking`,
`onboardingGuardian`). The union is closed on purpose, so SOS, alert, map, list and settings
screens cannot take a photo. A background screen draws the photo (or a dark fallback until one is chosen), a flat overlay,
and a gradient (`PHOTO_GRADIENT`) that darkens the top behind the status bar and the bottom
half where buttons and small print sit. The photo uses cover sizing, so on a shorter or
wider screen the sides or the top and bottom are cropped; the gradient keeps the bottom
readable wherever the crop lands. It switches the status bar to light icons only when no navigation header sits
above it; otherwise the header is under the status bar and the root layout's theme-based
style applies.

`Screen` also sets the surface tone to `image`. `Text` then renders surface colours
(`text`, `textMuted`, `primary`, ...) in `onOverlay`, and ghost buttons follow. `Card`,
`Banner` and `SegmentedControl` reset the tone to `default` because they draw their own
opaque background. An `ink` button on a photo is drawn as `primary`, because light-mode ink
is nearly the overlay colour.

The overlay defaults to the `overlay` token (opacity 0.55). A photo in
`theme/backgrounds.ts` may set `overlayOpacity` between 0.55 and 0.65 (values outside are
clamped); pick the lowest value at which every text pair on that photo passes WCAG AA.
`pnpm check:contrast` checks this: it scales each photo to about 1 px per dp, blurs it by
about a glyph stroke, and requires 4.5:1 for `onOverlay` text at the brightest spot under
the flat overlay. The gradient is left out of the measurement because it only darkens.

Adding a photo: put the WebP in `mobile/assets/backgrounds/`, add it to
`backgroundPhotoSpecs` and to the `require()` list in `theme/background-sources.ts`, run
`pnpm check:contrast` to find the overlay, and record the result in `CREDITS.md`.

Photos are licensed from Unsplash or Pexels only, stored as WebP and recorded in
`mobile/assets/backgrounds/CREDITS.md`.

### Buttons while loading

A loading button keeps its variant's colours and shows a spinner with a short
`loadingTitle` ("Logging in…", "Sending…") instead of the grey disabled look, because the
action is in progress rather than unavailable. It still ignores presses.

### Component gallery

`app/dev/ui-gallery.tsx` renders every component with EN/Bangla and plain/photo toggles.
It returns a redirect when `__DEV__` is false, so preview and production builds cannot
open it by deep link.

### Migrating screens

Screens move to the new components one flow at a time (auth and invites first, then home
and SOS, then the guardian app, then the dashboard). The welcome, log in, sign-up, forgot
password and reset password screens have moved; they hide the navigation header and draw
`components/AuthHeader.tsx` (brand or back button, plus the language switch) on the photo.
The student's Guardians tab, the remove-guardian confirmation and the guardian's "Link to
someone" screen have moved too.

The welcome screen asks for a persona (student, working woman or guardian, in
`lib/personas.ts`). Only the role is stored: guardian creates a guardian account and the
other two create a user account. Apart from that the persona only changes wording.
`profiles.role` decides the home: log in and sign-up go through `signInAs` in
`lib/auth-context.tsx` (logic in `lib/sign-in-gate.ts`), which holds the new session back
until its role matches the card and otherwise signs it out on this device and offers the
right card. Student and working woman both accept a user account. A restored session
routes by the role from the server, or the copy cached on the device when offline.
`lib/auth-session.ts` turns auth events into what the root layout routes on. The splash
only covers the first auth resolution: token refreshes and app resumes for the same account
swap in the new tokens without unmounting the navigator, and re-check the role in the
background, so an SOS, journey, live sharing or fake call is never reset. The old `PasswordInput`, `LanguageToggle` and `constants/Colors.ts` are gone. The dashboard uses the same values as CSS variables; see
"Dashboard theme and UI components" below.

## Dashboard theme and UI components

```
dashboard/app/theme.css       tokens: CSS variables (light, dark) exposed as Tailwind utilities
dashboard/components/ui/      base components, styled only with those utilities
dashboard/app/**              pages, built on components/ui/
```

`theme.css` copies the mobile tokens (`mobile/theme/colors.ts`, `spacing.ts`, `shadows.ts`,
`typography.ts`) into `--sp-*` variables and maps them to Tailwind utilities with the mobile
names: `bg-surface`, `text-text-muted`, `border-border-input`, `bg-danger`, `shadow-sos`.
`pnpm test:dashboard` fails if a colour, shadow, radius or the screen gutter drifts from the
mobile value, so contrast checked by `pnpm check:contrast` holds on the web too. Change a
value on mobile first, then copy it.

- Dark mode follows `prefers-color-scheme`; there is no manual switch.
- Spacing uses Tailwind's 4 px scale (mobile 4/8/12/16/28/40 = `1`/`2`/`3`/`4`/`7`/`10`)
  plus `gutter` for the 22 px page edge. Radii replace Tailwind's `sm` to `xl` with the
  mobile 10/14/18/22 px, plus `pill`.
- Text uses the `type-*` utilities (`type-h1`, `type-body`, `type-label`, ...), which carry
  family, weight, size, line height and tracking together.
- Fonts load through `next/font` in `app/layout.tsx`. Hind Siliguri sits second in every
  font stack, so Bengali characters fall back to it even inside English text.
- `<html lang>` follows the chosen language (`LanguageProvider` updates it on toggle). Under
  `lang="bn"` text gets a 1.6 line height and no letter spacing. The privacy policy and
  terms are English only and set `lang="en"` on their `<main>`.
- Language source: a signed-in guardian's `profiles.preferred_language` wins. Signed-out
  pages (sign-in, sign-up, password reset, guardian-only) have their own EN/Bangla switch
  stored in the `sp-language` cookie, which sign-up copies into the new profile. The
  cookie follows whatever is shown, so it is also the fallback when the profile can't be
  read. The dashboard layout renders `ServerLanguageSync`, because the root layout (and
  `LanguageProvider`) stays mounted across sign-in.

Base components: `Button` (and `buttonClasses()` for links styled as buttons), `Input`,
`PasswordInput`, `Card`, `Banner`, `Badge` and `SegmentedControl`. Variants match the
mobile components of the same name. `/dev/ui-gallery` renders them all with an EN/Bangla
switch; production builds answer 404 there.

Pages move to these components in separate PRs: public pages (sign-in, sign-up, password
reset, privacy, terms), then the dashboard overview, then settings.

The signed-out pages are one centred card on the page background, with no photo. Their
shared class strings live in `components/public-page-styles.ts`. Their inputs have no
visible label (placeholders only), so they use `inputClasses()` on a plain `<input>`
instead of `Input`; buttons use `buttonClasses({ loading })` so a pending submit keeps its
colours. Until a page moves it
keeps its old Tailwind classes, but it already picks up the new fonts and page colours.

The signed-in shell (`app/dashboard/dashboard-header.tsx`) is one element for both sizes: a
top bar below the `lg` breakpoint and the board's ink sidebar from `lg` up (surface-coloured
in dark mode, where ink is near-white). It links only to pages that exist: the overview,
labelled with `dashboardTitle`, and settings. Active alerts stay the first section of the
overview at every width; the SOS card is the solid danger fill with a 1-second pulse.

## Guardian links

A `guardian_links` row goes `pending` (the student created an invite code) → `accepted`
(a guardian redeemed it with `redeem_guardian_invite`) → `revoked`. Every policy that gives
a guardian access to a student's data (alerts, alert locations, journeys, live sharing,
location history, profile, avatar) requires `status = 'accepted'`, so revoking ends access
at the database.

- **Revoking**: `revoke_guardian_link(p_link_id)` can only be called by the student on the
  link. It ends an accepted link or cancels an unused code. A revoked link can never become
  pending or accepted again (the update trigger rejects it); linking again needs a new code.
- **Expiry**: an invite code can be redeemed for 24 hours after it is created; after that
  `redeem_guardian_invite` gives the same error as for an unknown code. The
  `expire-guardian-invites` cron job (`expire_guardian_invites()`, every 15 minutes)
  revokes expired pending codes so they leave the student's list.
- **SOS recipients**: `sos_recipient_guardian_ids(p_user_id)` is the only list of who is
  told about an SOS outside the app. It is callable by the service role only.
  `send-alert-email` uses it, and the push sender must use it too.
- **Open guardian apps**: `guardian_links` is in the Realtime publication.
  `lib/use-guardian-link-revoked.ts` listens for the signed-in guardian's links turning
  `revoked`, and the active alerts, live sharing, location history and past alerts views
  drop that student straight away. RLS already stops new data; this clears what is on
  screen. The guardian is not told who removed them or why.

`supabase/tests/rls.test.mjs` covers access before and after revoking, who may revoke, and
that a revoked or cancelled code cannot be redeemed or reactivated.

### Guardian invite requests

The newer direction (plan: `docs/plans/guardian-invite-requests.md`): the guardian creates
a code, the student enters it, reviews who is asking, and accepts or declines. Accepting
inserts an accepted `guardian_links` row, so everything above (revoking, SOS recipients,
the one-accepted-link-per-pair index) applies unchanged. The old flow stays on the server
for one release cycle for installed 1.1/1.2 apps.

- **Table**: `guardian_requests`, status `waiting` → `claimed` → `accepted` or `declined`,
  or `cancelled` / `expired`. Codes are 8 characters from the invite alphabet, unique while
  waiting or claimed, and expire 24 hours after creation (`expires_at`).
- **Guardian**: no policies on the table. `create_guardian_request()` (3 waiting at once,
  10 a day), `list_guardian_requests()` (id, code, created_at and `waiting`/`inactive`,
  last 7 days) and `cancel_guardian_request()`. A declined request reads as `waiting` and
  keeps its slot under the cap until `expires_at`, exactly like an unused code.
- **Student**: SELECT on rows they claimed (any status, so Realtime delivers cancels);
  `list_my_guardian_requests()` for the open ones with the guardian's name;
  `accept_guardian_request()` and `decline_guardian_request()` before `expires_at`.
- **Lookup**: only through the `claim-guardian-request` Edge Function, which calls the
  service-role-only `claim_guardian_request` (by code) or `get_claimed_guardian_request`
  (by request id, to re-open the review screen) and signs the guardian's avatar for 600
  seconds. Every failed code lookup gives the same `invalid_code` error and is recorded in
  `auth_rate_limit_events` (bucket `invite_lookup`, key = SHA-256 of the student id): 5 per
  15 minutes and 20 per day. Successful lookups and re-opens are not counted.
- **Cron**: `expire-guardian-requests` (`expire_guardian_requests()`, every 15 minutes)
  marks open requests expired and deletes requests older than 30 days.
- **Guardian app**: the Invite tab (`app/(guardian)/invite.tsx`) creates, shares and
  cancels codes. The guardian can't receive `guardian_requests` over Realtime, so
  `lib/use-guardian-requests.ts` re-fetches the list on focus, on return to the
  foreground, when an accepted `guardian_links` row is inserted for them
  (`useGuardianLinkAdded`), and when the earliest waiting code reaches its 24 hours.
- **Student app**: the Guardians tab takes a code ("Have an invite code?") and lists open
  requests as cards; `lib/use-my-guardian-requests.ts` subscribes to the student's own
  `guardian_requests` rows, so a cancel or expiry removes the card at once. The review
  screen (`app/(tabs)/guardian-request.tsx`) re-opens a request with `{ requestId }` and
  shows the placeholder avatar if there is no photo or the signed URL has expired. The
  student's **Invite guardian** button only shares a message; it creates nothing.
- **Older apps**: until the removal milestone in the plan, the guardian's Invite tab can
  still redeem a student-made code ("Have a code from an older SafePath?") and the
  student's Guardians tab can still make one ("Guardian has an older SafePath?"). The
  dashboard no longer links anyone; it tells web-only guardians to link from the app.
