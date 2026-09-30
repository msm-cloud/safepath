import type { TextStyle } from 'react-native';

// Sora for headings, Figtree for everything else, Hind Siliguri for Bangla.
// Sora and Figtree have no Bengali glyphs, so Bangla text always switches
// to Hind Siliguri (which also covers Latin, for mixed strings).
//
// Android cannot synthesise weights for custom fonts, so each weight is its
// own family name (matching the keys registered in theme/fonts.ts) and
// styles never set `fontWeight`.

export type FontRole = 'display' | 'body';
export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type Script = 'latin' | 'bengali';

type Families = {
  display: Partial<Record<FontWeight, string>>;
  body: Record<FontWeight, string>;
};

const families: Record<Script, Families> = {
  latin: {
    display: { semibold: 'Sora_600SemiBold', bold: 'Sora_700Bold' },
    body: {
      regular: 'Figtree_400Regular',
      medium: 'Figtree_500Medium',
      semibold: 'Figtree_600SemiBold',
      bold: 'Figtree_700Bold',
    },
  },
  bengali: {
    display: { semibold: 'HindSiliguri_600SemiBold', bold: 'HindSiliguri_700Bold' },
    body: {
      regular: 'HindSiliguri_400Regular',
      medium: 'HindSiliguri_500Medium',
      semibold: 'HindSiliguri_600SemiBold',
      bold: 'HindSiliguri_700Bold',
    },
  },
};

// Sora only ships in the two heavy weights; lighter display text falls back
// to the body face at the same weight.
export function fontFamily(script: Script, role: FontRole, weight: FontWeight): string {
  const { display, body } = families[script];
  return (role === 'display' ? display[weight] : undefined) ?? body[weight];
}

const BENGALI = /[ঀ-৿]/;

export function hasBengali(text: string): boolean {
  return BENGALI.test(text);
}

export type TextVariant =
  'display' | 'h1' | 'h2' | 'title' | 'button' | 'body' | 'bodySm' | 'label' | 'caption' | 'micro';

type VariantSpec = {
  role: FontRole;
  weight: FontWeight;
  size: number;
  lineHeight: number;
  letterSpacing?: number;
};

// Sizes and weights follow the boards; line heights are rounded to whole
// pixels so text sits on the same baseline on both platforms.
export const textVariants: Record<TextVariant, VariantSpec> = {
  display: { role: 'display', weight: 'bold', size: 36, lineHeight: 40, letterSpacing: -0.7 },
  h1: { role: 'display', weight: 'bold', size: 30, lineHeight: 36, letterSpacing: -0.5 },
  h2: { role: 'display', weight: 'bold', size: 24, lineHeight: 30, letterSpacing: -0.3 },
  title: { role: 'body', weight: 'bold', size: 18, lineHeight: 24 },
  button: { role: 'body', weight: 'bold', size: 17, lineHeight: 22 },
  body: { role: 'body', weight: 'regular', size: 16, lineHeight: 24 },
  bodySm: { role: 'body', weight: 'regular', size: 15, lineHeight: 22 },
  label: { role: 'body', weight: 'bold', size: 14, lineHeight: 20 },
  caption: { role: 'body', weight: 'regular', size: 13, lineHeight: 19 },
  micro: { role: 'body', weight: 'bold', size: 12, lineHeight: 16, letterSpacing: 0.3 },
};

// Bengali vowel signs and conjuncts reach well above and below the Latin
// line box, so Bangla gets taller lines and no tracking (negative tracking
// breaks conjuncts apart).
const BENGALI_LINE_HEIGHT = 1.6;

export function textStyle(
  variant: TextVariant,
  script: Script,
  weight?: FontWeight
): Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'> {
  const spec = textVariants[variant];
  const size = spec.size;
  if (script === 'bengali') {
    return {
      fontFamily: fontFamily('bengali', spec.role, weight ?? spec.weight),
      fontSize: size,
      lineHeight: Math.max(spec.lineHeight, Math.round(size * BENGALI_LINE_HEIGHT)),
      letterSpacing: 0,
    };
  }
  return {
    fontFamily: fontFamily('latin', spec.role, weight ?? spec.weight),
    fontSize: size,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing ?? 0,
  };
}
