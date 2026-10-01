import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { View } from 'react-native';

import AuthHeader from '@/components/AuthHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import IconTile from '@/components/ui/IconTile';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import {
  DEFAULT_PERSONA,
  PERSONA_HINT,
  PERSONA_LABEL,
  PERSONAS,
  type Persona,
} from '@/lib/personas';
import { useTheme } from '@/theme';

const PERSONA_ICON: Record<Persona, SymbolViewProps['name']> = {
  student: { ios: 'graduationcap', android: 'school', web: 'school' },
  working: { ios: 'briefcase', android: 'work', web: 'work' },
  guardian: { ios: 'heart', android: 'favorite', web: 'favorite' },
};

// The first screen anyone sees without a session (see the `!session` guard
// in app/_layout.tsx). The persona only frames sign-up wording and picks the
// role a new account is created with; an existing account is always routed
// by its stored profile.role after log in.
export default function WelcomeScreen() {
  const { t } = useLanguage();
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);

  return (
    <Screen background="welcome" contentStyle={{ gap: spacing.lg }}>
      <AuthHeader leading="brand" />

      <View style={{ gap: spacing.sm }}>
        <Text variant="display" accessibilityRole="header">
          {t('welcomeHeadline')}
        </Text>
        {/* Decorative: the same line in the other language. */}
        <Text variant="title" importantForAccessibility="no" accessibilityElementsHidden>
          {t('welcomeHeadlineAccent')}
        </Text>
        <Text>{t('welcomeTagline')}</Text>
      </View>

      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        <Text variant="label">{t('personaQuestion')}</Text>
        {PERSONAS.map((option) => {
          const selected = option === persona;
          return (
            <Card
              key={option}
              padding="md"
              selected={selected}
              onPress={() => setPersona(option)}
              accessibilityLabel={`${t(PERSONA_LABEL[option])}. ${t(PERSONA_HINT[option])}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconTile icon={PERSONA_ICON[option]} tone={selected ? 'primary' : 'neutral'} />
                <View style={{ flex: 1 }}>
                  <Text variant="title">{t(PERSONA_LABEL[option])}</Text>
                  <Text variant="bodySm" color="textSecondary">
                    {t(PERSONA_HINT[option])}
                  </Text>
                </View>
                {selected && (
                  <SymbolView
                    name={{
                      ios: 'checkmark.circle.fill',
                      android: 'check_circle',
                      web: 'check_circle',
                    }}
                    tintColor={colors.primary}
                    size={26}
                  />
                )}
              </View>
            </Card>
          );
        })}
      </View>

      <View style={{ marginTop: 'auto', gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <SymbolView
            name={{ ios: 'lock', android: 'lock', web: 'lock' }}
            tintColor={colors.onOverlay}
            size={18}
          />
          <Text variant="caption" style={{ flex: 1 }}>
            {t('locationPrivacyNote')}
          </Text>
        </View>
        <Button
          title={t('continueAsPersona', { persona: t(PERSONA_LABEL[persona]) })}
          onPress={() => router.push({ pathname: '/(auth)/sign-up', params: { persona } })}
        />
        <Text align="center">
          {t('haveAccountPrompt')}{' '}
          <Text
            weight="bold"
            accessibilityRole="link"
            onPress={() => router.push('/(auth)/sign-in')}
            style={{ textDecorationLine: 'underline' }}
          >
            {t('logInLink')}
          </Text>
        </Text>
      </View>
    </Screen>
  );
}
