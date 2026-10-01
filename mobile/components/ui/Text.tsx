import { Children, type ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useLanguage } from '@/lib/language-context';
import {
  hasBengali,
  textStyle,
  useTheme,
  type FontWeight,
  type Script,
  type TextVariant,
  type ThemeColors,
} from '@/theme';
import { useSurfaceTone } from '@/theme/surface-tone';

export type TextColor = Extract<
  keyof ThemeColors,
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'textDisabled'
  | 'primary'
  | 'dangerText'
  | 'onInk'
  | 'onPrimary'
  | 'onDanger'
  | 'onPrimarySoft'
  | 'onSuccessSoft'
  | 'onWarningSoft'
  | 'onDangerSoft'
  | 'onInfoSoft'
  | 'onOverlay'
>;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: TextColor;
  weight?: FontWeight;
  align?: 'left' | 'center' | 'right';
  // Forces a script when the content can't be inspected (e.g. nested
  // elements). By default Bangla is used when the app language is Bangla or
  // the string itself contains Bengali characters.
  script?: Script;
};

// Colours meant for plain page/card backgrounds. On a photo these switch to
// the overlay text colour; muted greys would not hold contrast there. Label
// colours for filled controls (onInk, onPrimary, ...) are left alone.
const SURFACE_COLORS = new Set<TextColor>([
  'text',
  'textSecondary',
  'textMuted',
  'textDisabled',
  'primary',
  'dangerText',
]);

function plainText(children: ReactNode): string {
  return Children.toArray(children)
    .filter((child) => typeof child === 'string' || typeof child === 'number')
    .join('');
}

export function useScript(content: string, override?: Script): Script {
  const { language } = useLanguage();
  if (override) return override;
  return language === 'bn' || hasBengali(content) ? 'bengali' : 'latin';
}

export default function Text({
  variant = 'body',
  color,
  weight,
  align,
  script,
  style,
  children,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const tone = useSurfaceTone();
  const resolvedScript = useScript(plainText(children), script);
  const key = color ?? 'text';
  const resolvedColor =
    tone === 'image' && SURFACE_COLORS.has(key) ? colors.onOverlay : colors[key];

  return (
    <RNText
      style={[
        textStyle(variant, resolvedScript, weight),
        { color: resolvedColor },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
