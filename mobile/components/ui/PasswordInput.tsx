import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/theme';

import Input, { type InputProps } from './Input';

export type PasswordInputProps = Omit<InputProps, 'secureTextEntry' | 'trailing'>;

export default function PasswordInput(props: PasswordInputProps) {
  const { t } = useLanguage();
  const { colors, sizes } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          onPress={() => setVisible((prev) => !prev)}
          style={{
            width: sizes.minTouch,
            height: sizes.minTouch,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={visible ? t('hidePasswordLabel') : t('showPasswordLabel')}
        >
          <SymbolView
            name={
              visible
                ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                : { ios: 'eye', android: 'visibility', web: 'visibility' }
            }
            tintColor={colors.textSecondary}
            size={20}
          />
        </Pressable>
      }
    />
  );
}
