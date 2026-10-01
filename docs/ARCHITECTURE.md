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
  backgrounds.ts              ScreenBackground union + photo sources
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
in both schemes, and fails below WCAG AA.

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
background screen draws the photo (or a dark fallback until one is chosen) and the `overlay`
colour on top. It switches the status bar to light icons only when no navigation header sits
above it; otherwise the header is under the status bar and the root layout's theme-based
style applies.

`Screen` also sets the surface tone to `image`. `Text` then renders surface colours
(`text`, `textMuted`, `primary`, ...) in `onOverlay`, and ghost buttons follow. `Card`,
`Banner` and `SegmentedControl` reset the tone to `default` because they draw their own
opaque background.

The overlay defaults to the `overlay` token (opacity 0.55). A photo in
`theme/backgrounds.ts` may set `overlayOpacity` between 0.55 and 0.65 (values outside are
clamped); pick the lowest value at which every text pair on that photo passes WCAG AA.

Photos are licensed from Unsplash or Pexels only, stored as WebP and recorded in
`mobile/assets/backgrounds/CREDITS.md`.

### Component gallery

`app/dev/ui-gallery.tsx` renders every component with EN/Bangla and plain/photo toggles.
It returns a redirect when `__DEV__` is false, so preview and production builds cannot
open it by deep link.

### Migrating screens

Screens move to the new components one flow at a time (auth and invites first, then home
and SOS, then the guardian app, then the dashboard). `constants/Colors.ts` and the older
components it serves (`PasswordInput`, `LanguageToggle`, the settings rows) are removed
once nothing imports them. The dashboard will get the same values as Tailwind CSS
variables when it is reworked.
