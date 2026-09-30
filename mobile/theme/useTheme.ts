import { useColorScheme } from '@/components/useColorScheme';

import { colors, type ColorScheme, type ThemeColors } from './colors';
import { shadows, type ShadowLevel } from './shadows';
import { radius, sizes, spacing } from './spacing';

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  shadows: Record<ShadowLevel, string | undefined>;
  spacing: typeof spacing;
  radius: typeof radius;
  sizes: typeof sizes;
};

export function useTheme(): Theme {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    scheme,
    colors: colors[scheme],
    shadows: shadows[scheme],
    spacing,
    radius,
    sizes,
  };
}
