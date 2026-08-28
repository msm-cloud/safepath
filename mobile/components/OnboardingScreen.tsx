import OnboardingCarousel, { type OnboardingSlide } from '@/components/OnboardingCarousel';
import { useLanguage } from '@/lib/language-context';

// Supplies the actual student/guardian copy + icons to the generic
// OnboardingCarousel. Used two ways: embedded directly by the (tabs)/
// (guardian) landing screens right after a first-time sign-up (see
// lib/use-pending-onboarding.ts), and pushed as its own screen for
// on-demand replay from Settings (components/HelpTutorialScreen.tsx) —
// same component, same content, so the two can never drift apart.
export default function OnboardingScreen({
  role,
  onFinish,
}: {
  role: 'user' | 'guardian';
  onFinish: () => void;
}) {
  const { t } = useLanguage();

  const studentSlides: OnboardingSlide[] = [
    {
      icon: { ios: 'hand.wave.fill', android: 'waving_hand', web: 'waving_hand' },
      iconColor: '#2f95dc',
      iconBackgroundColor: '#e8f4fc',
      heading: t('onboardingStudentWelcomeTitle'),
      body: t('onboardingStudentWelcomeBody'),
    },
    {
      icon: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
      iconColor: '#d33',
      iconBackgroundColor: '#fde8e8',
      heading: t('onboardingStudentSosTitle'),
      body: t('onboardingStudentSosBody'),
    },
    {
      icon: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' },
      iconColor: '#ff9500',
      iconBackgroundColor: '#fff2e0',
      heading: t('onboardingStudentGuardianTitle'),
      body: t('onboardingStudentGuardianBody'),
    },
    {
      icon: { ios: 'person.2.fill', android: 'people', web: 'people' },
      iconColor: '#34c759',
      iconBackgroundColor: '#e8f9ee',
      heading: t('onboardingStudentContactsTitle'),
      body: t('onboardingStudentContactsBody'),
    },
    {
      icon: { ios: 'location.fill', android: 'location_on', web: 'location_on' },
      iconColor: '#af52de',
      iconBackgroundColor: '#f6ebfb',
      heading: t('onboardingStudentJourneyTitle'),
      body: t('onboardingStudentJourneyBody'),
    },
  ];

  const guardianSlides: OnboardingSlide[] = [
    {
      icon: { ios: 'hand.wave.fill', android: 'waving_hand', web: 'waving_hand' },
      iconColor: '#2f95dc',
      iconBackgroundColor: '#e8f4fc',
      heading: t('onboardingGuardianWelcomeTitle'),
      body: t('onboardingGuardianWelcomeBody'),
    },
    {
      icon: { ios: 'link', android: 'link', web: 'link' },
      iconColor: '#ff9500',
      iconBackgroundColor: '#fff2e0',
      heading: t('onboardingGuardianLinkTitle'),
      body: t('onboardingGuardianLinkBody'),
    },
    {
      icon: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
      iconColor: '#d33',
      iconBackgroundColor: '#fde8e8',
      heading: t('onboardingGuardianAlertsTitle'),
      body: t('onboardingGuardianAlertsBody'),
    },
  ];

  return (
    <OnboardingCarousel
      slides={role === 'guardian' ? guardianSlides : studentSlides}
      onFinish={onFinish}
    />
  );
}
