import { Redirect, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import Banner from '@/components/ui/Banner';
import Button, { type ButtonVariant } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import IconTile, { type IconTileTone } from '@/components/ui/IconTile';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import Screen from '@/components/ui/Screen';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Text from '@/components/ui/Text';
import { useLanguage } from '@/lib/language-context';
import type { Language } from '@/lib/translations';
import { spacing, textVariants, useTheme, type TextVariant } from '@/theme';

// Development-only catalogue of the base components, used to check them in
// light/dark and English/Bangla on a real device before screens adopt them.
// Release and preview builds redirect away, so the route cannot be reached
// by deep link outside a development build.
export default function UiGalleryRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <UiGallery />;
}

const BUTTON_VARIANTS: ButtonVariant[] = [
  'ink',
  'primary',
  'secondary',
  'ghost',
  'danger',
  'dangerOutline',
];

const ICON_TONES: IconTileTone[] = [
  'neutral',
  'primary',
  'primarySoft',
  'danger',
  'success',
  'warning',
  'info',
];

const SAMPLE = {
  en: 'You never walk alone.',
  bn: 'আপনি কখনো একা নন।',
};

type Surface = 'plain' | 'photo';

function UiGallery() {
  const { language, setLanguage } = useLanguage();
  const { scheme } = useTheme();
  const [surface, setSurface] = useState<Surface>('plain');
  const [selectedRole, setSelectedRole] = useState<'student' | 'guardian'>('student');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  return (
    <>
      <Stack.Screen options={{ title: 'UI gallery' }} />
      <Screen background={surface === 'photo' ? 'welcome' : undefined} edges={['bottom']}>
        <View style={{ gap: spacing.xxl }}>
          <Section title={`Controls (${scheme} theme)`}>
            <SegmentedControl<Language>
              accessibilityLabel="Language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'en', label: 'EN', accessibilityLabel: 'English' },
                { value: 'bn', label: 'বাংলা', accessibilityLabel: 'Bangla' },
              ]}
            />
            <SegmentedControl<Surface>
              accessibilityLabel="Surface"
              value={surface}
              onChange={setSurface}
              options={[
                { value: 'plain', label: 'Plain' },
                { value: 'photo', label: 'Photo overlay' },
              ]}
            />
          </Section>

          <Section title="Typography">
            {(Object.keys(textVariants) as TextVariant[]).map((variant) => (
              <View key={variant}>
                <Text variant="micro" color="textMuted">
                  {variant}
                </Text>
                <Text variant={variant}>{SAMPLE.en}</Text>
                <Text variant={variant}>{SAMPLE.bn}</Text>
              </View>
            ))}
            <Text color="textSecondary">textSecondary</Text>
            <Text color="textMuted">textMuted</Text>
            <Text color="primary">primary (link)</Text>
            <Text color="dangerText">dangerText</Text>
          </Section>

          <Section title="Buttons">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} title={variant} variant={variant} onPress={() => {}} />
            ))}
            <Button
              title="With icon"
              icon={{ ios: 'phone.fill', android: 'call' }}
              onPress={() => {}}
            />
            <Button title="Loading" loading onPress={() => {}} />
            <Button title="Disabled" disabled onPress={() => {}} />
            <Button title="Disabled ghost" variant="ghost" disabled onPress={() => {}} />
            <Button title="Small" size="small" fullWidth={false} onPress={() => {}} />
          </Section>

          <Section title="Inputs">
            <Card>
              <View style={{ gap: spacing.lg }}>
                <Input
                  label="Full name"
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  helper="Type Bangla here to check the font switch."
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Input label="With error" value="01XXX" error="Enter a valid phone number." />
                <Input label="Disabled" value="Read only" editable={false} />
              </View>
            </Card>
          </Section>

          <Section title="Cards">
            <Card
              onPress={() => setSelectedRole('student')}
              selected={selectedRole === 'student'}
              accessibilityLabel="Student"
            >
              <RoleRow tone="primary" title="Student" subtitle="Selected when chosen" />
            </Card>
            <Card
              onPress={() => setSelectedRole('guardian')}
              selected={selectedRole === 'guardian'}
              accessibilityLabel="Guardian"
            >
              <RoleRow tone="neutral" title="Guardian" subtitle="Pressable card" />
            </Card>
            <Card variant="muted">
              <Text>Muted card</Text>
            </Card>
          </Section>

          <Section title="Banners">
            <Banner
              tone="primary"
              title="Primary"
              message="Your location is shared only when you choose."
            />
            <Banner
              tone="info"
              message="Info banner."
              icon={{ ios: 'info.circle', android: 'info' }}
            />
            <Banner tone="success" message="Success banner." />
            <Banner
              tone="warning"
              message="Location access is set to 'While using the app'."
              action={{ label: 'Open settings', onPress: () => {} }}
            />
            <Banner tone="danger" title="Danger" message="Couldn't send the alert. Try again." />
          </Section>

          <Section title="Icon tiles">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {ICON_TONES.map((tone) => (
                <IconTile key={tone} tone={tone} icon={{ ios: 'shield.fill', android: 'shield' }} />
              ))}
            </View>
          </Section>
        </View>
      </Screen>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="h2">{title}</Text>
      {children}
    </View>
  );
}

function RoleRow({
  tone,
  title,
  subtitle,
}: {
  tone: IconTileTone;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <IconTile tone={tone} icon={{ ios: 'person.fill', android: 'person' }} />
      <View style={{ flex: 1 }}>
        <Text variant="title">{title}</Text>
        <Text variant="bodySm" color="textMuted">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
