import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View } from 'react-native';

import { useTheme, type ThemeColors } from '@/theme';

export type IconTileTone =
  'neutral' | 'primary' | 'primarySoft' | 'danger' | 'success' | 'warning' | 'info';

export type IconTileProps = {
  icon: SymbolViewProps['name'];
  tone?: IconTileTone;
  size?: number;
};

const TONES: Record<IconTileTone, { bg: keyof ThemeColors; fg: keyof ThemeColors }> = {
  neutral: { bg: 'surfaceMuted', fg: 'text' },
  primary: { bg: 'primary', fg: 'onPrimary' },
  primarySoft: { bg: 'primarySoft', fg: 'onPrimarySoft' },
  danger: { bg: 'dangerSoft', fg: 'onDangerSoft' },
  success: { bg: 'successSoft', fg: 'onSuccessSoft' },
  warning: { bg: 'warningSoft', fg: 'onWarningSoft' },
  info: { bg: 'infoSoft', fg: 'onInfoSoft' },
};

// Decorative: the row or card it sits in carries the accessible label.
export default function IconTile({ icon, tone = 'neutral', size }: IconTileProps) {
  const { colors, sizes } = useTheme();
  const box = size ?? sizes.iconTile;
  const { bg, fg } = TONES[tone];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: box,
        height: box,
        borderRadius: Math.round(box * 0.3),
        backgroundColor: colors[bg],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SymbolView name={icon} tintColor={colors[fg]} size={Math.round(box / 2)} />
    </View>
  );
}
