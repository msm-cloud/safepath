import type { ColorScheme } from './colors';

// CSS box-shadow strings, supported by React Native's `boxShadow` style on
// the new architecture. Shadows are close to invisible on dark surfaces,
// so dark mode drops them and relies on the lighter surface colour and a
// border instead; only the SOS glow stays.

export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'sos';

const light: Record<ShadowLevel, string | undefined> = {
  none: undefined,
  sm: '0px 2px 8px rgba(23, 26, 47, 0.12)',
  md: '0px 6px 14px rgba(23, 26, 47, 0.08)',
  lg: '0px 12px 28px rgba(59, 69, 181, 0.18)',
  sos: '0px 14px 30px rgba(200, 35, 27, 0.35)',
};

const dark: Record<ShadowLevel, string | undefined> = {
  none: undefined,
  sm: undefined,
  md: undefined,
  lg: undefined,
  sos: '0px 14px 34px rgba(200, 35, 27, 0.5)',
};

export const shadows: Record<ColorScheme, Record<ShadowLevel, string | undefined>> = {
  light,
  dark,
};
