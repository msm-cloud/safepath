import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { textStyle, useTheme } from '@/theme';

import Text, { useScript } from './Text';

export type InputProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  helper?: string;
  error?: string;
  // Rendered inside the field on the right, e.g. the password visibility
  // toggle. The field reserves room for it so text never runs underneath.
  trailing?: ReactNode;
  ref?: Ref<TextInput>;
};

const TRAILING_WIDTH = 48;

export default function Input({
  label,
  helper,
  error,
  trailing,
  ref,
  value,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: InputProps) {
  const { colors, radius, sizes, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const script = useScript(value ?? '');

  // Line height inside a single-line TextInput clips descenders on Android,
  // so it is left out and the field's min height centres the text instead.
  const { lineHeight: _lineHeight, ...fontStyle } = textStyle('body', script);
  const borderColor = error ? colors.dangerText : focused ? colors.focus : colors.borderInput;

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      <Text variant="label">{label}</Text>
      <View style={styles.field}>
        <TextInput
          ref={ref}
          value={value}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          accessibilityState={{ disabled: !editable }}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            fontStyle,
            styles.input,
            {
              minHeight: sizes.input,
              borderRadius: radius.md,
              borderColor,
              backgroundColor: editable ? colors.surface : colors.surfaceMuted,
              color: editable ? colors.text : colors.textMuted,
              paddingHorizontal: spacing.lg,
              paddingRight: trailing ? TRAILING_WIDTH + spacing.xs : spacing.lg,
            },
          ]}
          {...rest}
        />
        {trailing && <View style={[styles.trailing, { width: TRAILING_WIDTH }]}>{trailing}</View>}
      </View>
      {error ? (
        <Text variant="caption" color="dangerText" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" color="textMuted">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1.5,
  },
  trailing: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
