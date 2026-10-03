import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { SurfaceToneContext } from '@/theme/surface-tone';

import Text from './Text';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  accessibilityLabel?: string;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  // Stretches the track and splits it evenly, for option sets too wide to
  // sit at their natural width inside a card.
  fullWidth?: boolean;
};

const TRACK_PADDING = 4;

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const { colors, radius, sizes, spacing } = useTheme();

  return (
    <SurfaceToneContext value="default">
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
        style={{
          flexDirection: 'row',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          padding: TRACK_PADDING,
          gap: spacing.xxs,
          borderRadius: radius.pill,
          backgroundColor: colors.track,
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.accessibilityLabel ?? option.label}
              accessibilityState={{ checked: selected }}
              style={{
                flex: fullWidth ? 1 : undefined,
                minHeight: sizes.minTouch - TRACK_PADDING * 2,
                paddingHorizontal: fullWidth ? spacing.xs : spacing.lg,
                borderRadius: radius.pill,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: selected ? colors.ink : 'transparent',
              }}
            >
              <Text variant="label" color={selected ? 'onInk' : 'text'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SurfaceToneContext>
  );
}
