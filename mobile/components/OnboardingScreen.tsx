import { useRouter, type Href } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';
import { View } from 'react-native';

import OnboardingCarousel, { type OnboardingSlide } from '@/components/OnboardingCarousel';
import Banner from '@/components/ui/Banner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import IconTile from '@/components/ui/IconTile';
import Text from '@/components/ui/Text';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Persona } from '@/lib/personas';
import type { TranslationKey } from '@/lib/translations';
import { useDevicePersona } from '@/lib/use-device-persona';
import { useTheme } from '@/theme';

const ICONS = {
  welcome: { ios: 'hand.wave.fill', android: 'waving_hand', web: 'waving_hand' },
  student: { ios: 'graduationcap', android: 'school', web: 'school' },
  working: { ios: 'briefcase', android: 'work', web: 'work' },
  sos: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  guardians: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' },
  sms: { ios: 'message', android: 'sms', web: 'sms' },
  alerts: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
} as const satisfies Record<string, SymbolViewProps['name']>;

// First slide for an at-risk user. Only the persona chosen on this device
// at sign-up changes the wording; without one the neutral welcome is used.
const USER_INTRO: Record<
  Exclude<Persona, 'guardian'> | 'none',
  { icon: SymbolViewProps['name']; heading: TranslationKey; body: TranslationKey }
> = {
  student: {
    icon: ICONS.student,
    heading: 'onboardingStudentIntroTitle',
    body: 'onboardingStudentIntroBody',
  },
  working: {
    icon: ICONS.working,
    heading: 'onboardingWorkingIntroTitle',
    body: 'onboardingWorkingIntroBody',
  },
  none: {
    icon: ICONS.welcome,
    heading: 'onboardingUserWelcomeTitle',
    body: 'onboardingUserWelcomeBody',
  },
};

type ChecklistItem = {
  key: string;
  // An icon, or a step number for an ordered list.
  marker: SymbolViewProps['name'] | number;
  title: TranslationKey;
  hint: TranslationKey;
};

function Checklist({ items }: { items: ChecklistItem[] }) {
  const { t } = useLanguage();
  const { colors, spacing } = useTheme();

  return (
    <Card padding="md" style={{ gap: spacing.lg }}>
      {items.map((item) => (
        <View
          key={item.key}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          {typeof item.marker === 'number' ? (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primarySoft,
              }}
            >
              <Text variant="label" color="onPrimarySoft">
                {item.marker}
              </Text>
            </View>
          ) : (
            <IconTile icon={item.marker} tone="primarySoft" size={40} />
          )}
          <View style={{ flex: 1 }}>
            <Text variant="label">{t(item.title)}</Text>
            <Text variant="caption" color="textSecondary">
              {t(item.hint)}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

// Shown once after a first sign-up (lib/use-pending-onboarding.ts) and
// replayable from Settings (components/HelpTutorialScreen.tsx); same
// component and content either way so the two never drift apart.
export default function OnboardingScreen({
  role,
  onFinish,
}: {
  role: 'user' | 'guardian';
  onFinish: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { session } = useAuth();
  const { loading, persona } = useDevicePersona(session?.user.id, role);

  // Leaves onboarding first, so going back from the target lands on the
  // screen onboarding was shown over.
  const finishTo = (href: Href) => {
    onFinish();
    router.navigate(href);
  };

  const later = <Button title={t('onboardingLaterButton')} variant="ghost" onPress={onFinish} />;

  if (loading) return null;

  const intro = USER_INTRO[persona === 'student' || persona === 'working' ? persona : 'none'];
  // Without a saved persona a user gets the student photo; it is the most
  // general of the three.
  const background =
    role === 'guardian'
      ? 'onboardingGuardian'
      : persona === 'working'
        ? 'onboardingWorking'
        : 'onboardingStudent';

  const userSlides: OnboardingSlide[] = [
    { key: 'intro', icon: intro.icon, tone: 'primary', heading: intro.heading, body: intro.body },
    {
      key: 'sos',
      icon: ICONS.sos,
      tone: 'danger',
      heading: 'onboardingSosJourneyTitle',
      body: 'onboardingSosJourneyBody',
    },
    {
      key: 'contacts',
      heading: 'onboardingContactsTitle',
      content: (
        <Checklist
          items={[
            {
              key: 'guardians',
              marker: ICONS.guardians,
              title: 'onboardingGuardiansRowTitle',
              hint: 'onboardingGuardiansRowHint',
            },
            {
              key: 'contacts',
              marker: ICONS.sms,
              title: 'onboardingContactsRowTitle',
              hint: 'onboardingContactsRowHint',
            },
          ]}
        />
      ),
      actions: (
        <>
          <Button title={t('onboardingAddGuardianButton')} onPress={() => finishTo('/contacts')} />
          <Button
            title={t('onboardingAddContactsButton')}
            variant="secondary"
            onPress={() => finishTo('/emergency-contacts')}
          />
          {later}
        </>
      ),
    },
  ];

  const guardianSlides: OnboardingSlide[] = [
    {
      key: 'welcome',
      icon: ICONS.welcome,
      tone: 'primary',
      heading: 'onboardingGuardianWelcomeTitle',
      body: 'onboardingGuardianWelcomeBody',
    },
    {
      key: 'alerts',
      icon: ICONS.alerts,
      tone: 'danger',
      heading: 'onboardingGuardianAlertsTitle',
      body: 'onboardingGuardianAlertsBody',
    },
    {
      key: 'link',
      heading: 'onboardingGuardianLinkTitle',
      content: (
        <Checklist
          items={[
            {
              key: 'ask',
              marker: 1,
              title: 'onboardingGuardianStep1Title',
              hint: 'onboardingGuardianStep1Hint',
            },
            {
              key: 'enter',
              marker: 2,
              title: 'onboardingGuardianStep2Title',
              hint: 'onboardingGuardianStep2Hint',
            },
            {
              key: 'linked',
              marker: 3,
              title: 'onboardingGuardianStep3Title',
              hint: 'onboardingGuardianStep3Hint',
            },
          ]}
        />
      ),
      note: <Banner tone="info" message={t('onboardingGuardianLocationNote')} />,
      actions: (
        <>
          <Button title={t('onboardingCreateCodeButton')} onPress={() => finishTo('/invite')} />
          {later}
        </>
      ),
    },
  ];

  return (
    <OnboardingCarousel
      slides={role === 'guardian' ? guardianSlides : userSlides}
      background={background}
      onFinish={onFinish}
    />
  );
}
