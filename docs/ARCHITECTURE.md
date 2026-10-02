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

`useTheme()` follows the system setting through `components/useColorScheme.ts`. Light
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

On web, `components/useColorScheme.web.ts` always returns `light`, so dark mode can only
be checked on a device or simulator.

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

`Screen` accepts `background?: 'welcome' | 'auth' | 'onboarding' | 'empty'`. The union is
closed on purpose: SOS, alert, map, list and settings screens cannot take a photo. A
background screen draws the photo (or a dark fallback until one is chosen), a flat overlay,
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
other two create a user account. The persona only changes wording on the signed-out
screens. The old `PasswordInput` and `LanguageToggle` are gone; `constants/Colors.ts`
and the remaining components that use it are removed once nothing imports them. The dashboard will get the same values as Tailwind CSS
variables when it is reworked.

## Guardian links

A `guardian_links` row goes `pending` (the student created an invite code) → `accepted`
(a guardian redeemed it with `redeem_guardian_invite`) → `revoked`. Every policy that gives
a guardian access to a student's data (alerts, alert locations, journeys, live sharing,
location history, profile, avatar) requires `status = 'accepted'`, so revoking ends access
at the database.

- **Revoking**: `revoke_guardian_link(p_link_id)` can only be called by the student on the
  link. It ends an accepted link or cancels an unused code. A revoked link can never become
  pending or accepted again (the update trigger rejects it); linking again needs a new code.
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
