// Checks WCAG 2.2 contrast for every text/background pair the mobile theme
// uses, in both colour schemes, and prints a Markdown table. Exits non-zero
// if any required pair falls below its threshold.
//
// Usage: pnpm check:contrast

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
    label: 'info (primary)',
    fg: 'onPrimarySoft',
    bg: 'primarySoft',
    level: 'text',
  },
  { group: 'Banner', label: 'success', fg: 'onSuccessSoft', bg: 'successSoft', level: 'text' },
  { group: 'Banner', label: 'warning', fg: 'onWarningSoft', bg: 'warningSoft', level: 'text' },
  { group: 'Banner', label: 'danger', fg: 'onDangerSoft', bg: 'dangerSoft', level: 'text' },
  { group: 'Banner', label: 'teal note', fg: 'onInfoSoft', bg: 'infoSoft', level: 'text' },

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

// Dark mode primary buttons must use dark label text, not white.
if (luminance(parse(colors.dark.onPrimary).rgb) > 0.2) {
  failures.push('dark: onPrimary must be a dark colour');
}

console.log(rows.join('\n'));

if (failures.length > 0) {
  console.error(`\n${failures.length} pair(s) below threshold:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\nAll required pairs pass.');
