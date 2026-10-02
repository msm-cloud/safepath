import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { colors, type ColorScheme } from './colors';
import { fontFamily, type Script } from './typography';

// React Navigation draws headers, tab bars and the screen behind each route
// from this theme. Headers use the page colour (`card`) so a header and the
// screen under it read as one surface, as on the boards.
//
// Each weight is its own family (see typography.ts), so fontWeight stays
// 'normal'; a numeric weight on a custom font makes Android fall back to
// the system face.
export function navigationTheme(scheme: ColorScheme, script: Script): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = colors[scheme];
  const font = (weight: 'regular' | 'medium' | 'semibold' | 'bold') => ({
    fontFamily: fontFamily(script, 'body', weight),
    fontWeight: 'normal' as const,
  });

  return {
    ...base,
    colors: {
      primary: c.primary,
      background: c.bg,
      card: c.bg,
      text: c.text,
      border: c.border,
      notification: c.danger,
    },
    fonts: {
      regular: font('regular'),
      medium: font('medium'),
      bold: font('bold'),
      heavy: font('bold'),
    },
  };
}
