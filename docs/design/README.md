# Design boards

`safepath-ui/` holds the exported "SafePath UI" design boards (16 screens) that the
mobile theme and base components are built from. They are kept verbatim as a reference
and are not part of any build.

- `canvas.json` lists every board with its title and canvas position.
- Each `*.dc.html` file is one screen at 390×844 (the web dashboard board is 1440×900).
- The boards reference a `support.js` runtime and Google Fonts that are not in the repo,
  so they will not render interactively when opened directly; read them for the colors,
  spacing, type sizes and layout.

The boards only define a light theme. The dark theme in `mobile/theme/colors.ts` is
derived from the dark surfaces on the fake call board (`User-FakeCall.dc.html`).

To update, replace the whole `safepath-ui/` folder with a fresh export.
