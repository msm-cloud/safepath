// Checks WCAG 2.2 contrast for every text/background pair the mobile theme
// uses, in both colour schemes, and prints a Markdown table. Exits non-zero
// if any required pair falls below its threshold.
//
// Usage: pnpm check:contrast

import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  backgroundPhotoSpecs,
  clampOverlayOpacity,
  type ScreenBackground,
} from '../mobile/theme/backgrounds.ts';
import { colors, type ColorScheme, type ThemeColors } from '../mobile/theme/colors.ts';

type Rgb = [number, number, number];
type Key = keyof ThemeColors;

// 4.5 for normal text, 3 for large text and for UI parts such as an input's
// focus ring. `info` rows are reported but never fail the run (WCAG exempts
// disabled controls, and plain input borders sit next to a visible label).
type Level = 'text' | 'large' | 'ui' | 'info';

type Pair = { group: string; label: string; fg: Key | 'overlayWorst'; bg: Key; level: Level };

const THRESHOLD: Record<Level, number> = { text: 4.5, large: 3, ui: 3, info: 0 };

const PAIRS: Pair[] = [
  { group: 'Text', label: 'Body on page', fg: 'text', bg: 'bg', level: 'text' },
  { group: 'Text', label: 'Body on card', fg: 'text', bg: 'surface', level: 'text' },
  { group: 'Text', label: 'Secondary on page', fg: 'textSecondary', bg: 'bg', level: 'text' },
  { group: 'Text', label: 'Secondary on card', fg: 'textSecondary', bg: 'surface', level: 'text' },
  { group: 'Text', label: 'Muted on page', fg: 'textMuted', bg: 'bg', level: 'text' },
  { group: 'Text', label: 'Muted on card', fg: 'textMuted', bg: 'surface', level: 'text' },
  {
    group: 'Text',
    label: 'Muted on muted card',
    fg: 'textMuted',
    bg: 'surfaceMuted',
    level: 'text',
  },
  { group: 'Text', label: 'Link on page', fg: 'primary', bg: 'bg', level: 'text' },
  { group: 'Text', label: 'Link on card', fg: 'primary', bg: 'surface', level: 'text' },
  { group: 'Text', label: 'Error text on page', fg: 'dangerText', bg: 'bg', level: 'text' },
  { group: 'Text', label: 'Error text on card', fg: 'dangerText', bg: 'surface', level: 'text' },
  { group: 'Text', label: 'Disabled on card', fg: 'textDisabled', bg: 'surface', level: 'info' },

  { group: 'Button', label: 'ink', fg: 'onInk', bg: 'ink', level: 'text' },
  { group: 'Button', label: 'ink (pressed)', fg: 'onInk', bg: 'inkPressed', level: 'text' },
  { group: 'Button', label: 'primary', fg: 'onPrimary', bg: 'primary', level: 'text' },
  {
    group: 'Button',
    label: 'primary (pressed)',
    fg: 'onPrimary',
    bg: 'primaryPressed',
    level: 'text',
  },
  { group: 'Button', label: 'secondary', fg: 'text', bg: 'surface', level: 'text' },
  {
    group: 'Button',
    label: 'secondary border on page',
    fg: 'borderInput',
    bg: 'bg',
    level: 'info',
  },
  { group: 'Button', label: 'ghost on page', fg: 'primary', bg: 'bg', level: 'text' },
  { group: 'Button', label: 'ghost on card', fg: 'primary', bg: 'surface', level: 'text' },
  { group: 'Button', label: 'danger', fg: 'onDanger', bg: 'danger', level: 'text' },
  {
    group: 'Button',
    label: 'danger (pressed)',
    fg: 'onDanger',
    bg: 'dangerPressed',
    level: 'text',
  },
  { group: 'Button', label: 'dangerOutline', fg: 'dangerText', bg: 'surface', level: 'text' },
  {
    group: 'Button',
    label: 'disabled label on track',
    fg: 'textDisabled',
    bg: 'track',
    level: 'info',
  },
  { group: 'Button', label: 'danger fill vs page', fg: 'danger', bg: 'bg', level: 'ui' },

  { group: 'Input', label: 'Value', fg: 'text', bg: 'surface', level: 'text' },
  { group: 'Input', label: 'Placeholder', fg: 'textMuted', bg: 'surface', level: 'text' },
  { group: 'Input', label: 'Focus ring', fg: 'focus', bg: 'surface', level: 'ui' },
  { group: 'Input', label: 'Resting border', fg: 'borderInput', bg: 'surface', level: 'info' },

  { group: 'Segmented', label: 'Selected', fg: 'onInk', bg: 'ink', level: 'text' },
  { group: 'Segmented', label: 'Unselected', fg: 'text', bg: 'track', level: 'text' },

  {
    group: 'Banner',
    label: 'primary',
    fg: 'onPrimarySoft',
    bg: 'primarySoft',
    level: 'text',
  },
  { group: 'Banner', label: 'success', fg: 'onSuccessSoft', bg: 'successSoft', level: 'text' },
  { group: 'Banner', label: 'warning', fg: 'onWarningSoft', bg: 'warningSoft', level: 'text' },
  { group: 'Banner', label: 'danger', fg: 'onDangerSoft', bg: 'dangerSoft', level: 'text' },
  { group: 'Banner', label: 'info', fg: 'onInfoSoft', bg: 'infoSoft', level: 'text' },

  // Avatar initials reuse the banner pairs above; only the placeholder glyph
  // has its own pair.
  { group: 'Avatar', label: 'Placeholder glyph', fg: 'textMuted', bg: 'track', level: 'ui' },
  { group: 'Badge', label: 'Role badge', fg: 'textSecondary', bg: 'track', level: 'text' },

  // Fake call setup's caller rows: a tinted fill with a primary ring when
  // selected, a plain card with a muted ring otherwise.
  { group: 'Choice', label: 'Selected label', fg: 'text', bg: 'primarySoft', level: 'text' },
  { group: 'Choice', label: 'Selected ring', fg: 'primary', bg: 'primarySoft', level: 'ui' },
  { group: 'Choice', label: 'Empty ring', fg: 'textMuted', bg: 'surface', level: 'ui' },
  { group: 'Choice', label: 'Initials on badge', fg: 'text', bg: 'warningSoft', level: 'text' },
  {
    group: 'Choice',
    label: 'Glyph on badge',
    fg: 'textSecondary',
    bg: 'surfaceMuted',
    level: 'ui',
  },

  { group: 'Switch', label: 'Off thumb on track', fg: 'textMuted', bg: 'track', level: 'ui' },
  { group: 'Switch', label: 'On thumb on track', fg: 'onPrimary', bg: 'primary', level: 'ui' },
  { group: 'Switch', label: 'On track vs card', fg: 'primary', bg: 'surface', level: 'ui' },

  // SOS active screen and the guardian alert header: everything on the
  // danger fill. Body text there is plain onDanger; nothing muted.
  { group: 'SOS', label: 'Text on SOS fill', fg: 'onDanger', bg: 'danger', level: 'text' },
  { group: 'SOS', label: 'Status pill', fg: 'onDanger', bg: 'dangerPressed', level: 'text' },
  { group: 'SOS', label: 'Call button', fg: 'onEmergencyCall', bg: 'onDanger', level: 'text' },
  {
    group: 'SOS',
    label: 'Call button (pressed)',
    fg: 'onEmergencyCall',
    bg: 'emergencyCallPressed',
    level: 'text',
  },
  { group: 'SOS', label: 'Call button vs SOS fill', fg: 'onDanger', bg: 'danger', level: 'ui' },

  // Worst case for background images: a pure white pixel under the overlay.
  {
    group: 'Overlay',
    label: 'Heading on photo (worst case)',
    fg: 'overlayWorst',
    bg: 'onOverlay',
    level: 'large',
  },
  {
    group: 'Overlay',
    label: 'Body on photo (worst case)',
    fg: 'overlayWorst',
    bg: 'onOverlay',
    level: 'info',
  },
];

function parse(color: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 };
  }
  const rgba = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(color.replace(/\s/g, ''));
  if (rgba) {
    return { rgb: [+rgba[1], +rgba[2], +rgba[3]], alpha: +rgba[4] };
  }
  throw new Error(`Unsupported colour: ${color}`);
}

function over(top: string, under: Rgb): Rgb {
  const { rgb, alpha } = parse(top);
  return rgb.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha))) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function resolve(theme: ThemeColors, key: Pair['fg']): Rgb {
  if (key === 'overlayWorst') return over(theme.overlay, [255, 255, 255]);
  return parse(theme[key]).rgb;
}

function hexOf(theme: ThemeColors, key: Pair['fg']): string {
  if (key === 'overlayWorst') return `overlay over #FFFFFF`;
  return theme[key];
}

const schemes: ColorScheme[] = ['light', 'dark'];
const failures: string[] = [];
const rows: string[] = [
  '| Group | Pair | Light | Dark | Needs |',
  '| --- | --- | --- | --- | --- |',
];

for (const pair of PAIRS) {
  const cells = schemes.map((scheme) => {
    const theme = colors[scheme];
    const value = ratio(resolve(theme, pair.fg), resolve(theme, pair.bg));
    const needed = THRESHOLD[pair.level];
    const ok = value >= needed;
    if (!ok) failures.push(`${scheme}: ${pair.group} / ${pair.label} = ${value.toFixed(2)}`);
    const mark = pair.level === 'info' ? '(info)' : ok ? 'pass' : 'FAIL';
    return `${value.toFixed(2)} ${mark} (${hexOf(theme, pair.fg)} / ${theme[pair.bg]})`;
  });
  const needs = pair.level === 'info' ? 'report only' : `${THRESHOLD[pair.level]}:1`;
  rows.push(`| ${pair.group} | ${pair.label} | ${cells[0]} | ${cells[1]} | ${needs} |`);
}

// Each background photo is measured at the brightest spot a line of text
// could sit on: the photo is scaled to roughly 1 px per dp and blurred by
// about a glyph stroke, so a lone bright pixel doesn't count but the sun
// does. Text, ghost buttons and links on a photo all use onOverlay, so one
// required pair covers them. Button fills are reported only: their labels
// are checked against the fill above, and a fill needs no contrast with
// the photo to be recognised as a button.
const PHOTO_DIR = fileURLToPath(new URL('../mobile/assets/backgrounds/', import.meta.url));
const PHOTO_SCALE_WIDTH = 360;
const PHOTO_BLUR_SIGMA = 1.5;
// Screen draws the overlay with this colour (palette.dark.bg) in both themes.
const PHOTO_OVERLAY_BASE = colors.dark.bg;
const FILLED_VARIANTS: { label: string; key: Key }[] = [
  { label: 'primary', key: 'primary' },
  { label: 'secondary', key: 'surface' },
  { label: 'danger', key: 'danger' },
];

async function photoExtremes(file: string, opacity: number): Promise<{ light: Rgb; dark: Rgb }> {
  const { data, info } = await sharp(PHOTO_DIR + file)
    .resize({ width: PHOTO_SCALE_WIDTH })
    .blur(PHOTO_BLUR_SIGMA)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const overlay = parse(PHOTO_OVERLAY_BASE).rgb;
  let light: Rgb = [0, 0, 0];
  let dark: Rgb = [255, 255, 255];
  for (let i = 0; i < data.length; i += info.channels) {
    const px = [0, 1, 2].map((c) =>
      Math.round(overlay[c] * opacity + data[i + c] * (1 - opacity))
    ) as Rgb;
    if (luminance(px) > luminance(light)) light = px;
    if (luminance(px) < luminance(dark)) dark = px;
  }
  return { light, dark };
}

async function photoReport(): Promise<string> {
  const lines = [
    '| Photo | Overlay | Pair | Light | Dark | Needs |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  const entries = Object.entries(backgroundPhotoSpecs) as [
    ScreenBackground,
    (typeof backgroundPhotoSpecs)[ScreenBackground],
  ][];
  for (const [name, spec] of entries) {
    if (!spec) continue;
    const opacity = clampOverlayOpacity(spec.overlayOpacity);
    const { light, dark } = await photoExtremes(spec.file, opacity);
    const row = (pair: string, values: [number, number], needed: number | null) => {
      const cells = values.map((value, i) => {
        if (needed !== null && value < needed) {
          failures.push(`${schemes[i]}: Photo ${name} / ${pair} = ${value.toFixed(2)}`);
        }
        const mark = needed === null ? '(info)' : value >= needed ? 'pass' : 'FAIL';
        return `${value.toFixed(2)} ${mark}`;
      });
      const needs = needed === null ? 'report only' : `${needed}:1`;
      lines.push(`| ${name} | ${opacity} | ${pair} | ${cells[0]} | ${cells[1]} | ${needs} |`);
    };
    const both = (key: Key, spot: Rgb): [number, number] =>
      schemes.map((scheme) => ratio(parse(colors[scheme][key]).rgb, spot)) as [number, number];

    row('Text, links and ghost buttons (brightest spot)', both('onOverlay', light), THRESHOLD.text);
    for (const variant of FILLED_VARIANTS) {
      row(`${variant.label} fill vs brightest spot`, both(variant.key, light), null);
      row(`${variant.label} fill vs darkest spot`, both(variant.key, dark), null);
    }
  }
  return lines.join('\n');
}

// Dark mode primary buttons must use dark label text, not white.
if (luminance(parse(colors.dark.onPrimary).rgb) > 0.2) {
  failures.push('dark: onPrimary must be a dark colour');
}

console.log(rows.join('\n'));
console.log(`\n${await photoReport()}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} pair(s) below threshold:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\nAll required pairs pass.');
