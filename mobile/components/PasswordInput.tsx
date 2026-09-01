import { SymbolView } from 'expo-symbols';
import { type RefObject, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useLanguage } from '@/lib/language-context';

// Small, self-contained show/hide toggle for password fields — local
// component state only, no auth logic touched at all (the underlying
// TextInput's value/onChangeText wiring is unchanged, only its
// secureTextEntry visual behavior). Reused by both sign-in.tsx and
// sign-up.tsx, whose password TextInput styling was already
// byte-identical, so it's baked in here rather than passed as a prop.
//
// inputRef/onFocus are optional passthroughs to the internal TextInput —
// added so a screen that scrolls the focused field above the keyboard
// (see lib/scroll-to-input.ts) can do that for the password field too,
// without this component needing to know anything about scrolling itself.
type PasswordInputProps = Pick<
  TextInputProps,
  'placeholder' | 'value' | 'onChangeText' | 'autoComplete' | 'onFocus'
> & {
  inputRef?: RefObject<TextInput | null>;
};

export default function PasswordInput({
  placeholder,
  value,
  onChangeText,
  autoComplete,
  onFocus,
  inputRef,
}: PasswordInputProps) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete={autoComplete}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
      />
      <Pressable
        style={styles.toggle}
        onPress={() => setVisible((prev) => !prev)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? t('hidePasswordLabel') : t('showPasswordLabel')}
      >
        <SymbolView
          name={
            visible
              ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
              : { ios: 'eye', android: 'visibility', web: 'visibility' }
          }
          tintColor="#888"
          size={20}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingRight: 44,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  toggle: {
    position: 'absolute',
    right: 12,
  },
});
