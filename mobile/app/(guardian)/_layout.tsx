import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useLanguage } from '@/lib/language-context';

// The guardian counterpart to app/(tabs)/_layout.tsx — a parallel tab
// group, routed to instead of (tabs) when profile.role === 'guardian' (see
// app/_layout.tsx). Does not touch or reuse any of the student screens.
export default function GuardianTabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('guardianActiveAlertsTitle'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="past-alerts"
        options={{
          title: t('guardianPastAlertsTitle'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'clock.fill', android: 'history', web: 'history' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="link"
        options={{
          title: t('guardianLinkTitle'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settingsTitle'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="change-password"
        options={{
          title: t('changePasswordLink'),
          // Reachable from Settings via router.push(), not its own tab —
          // same href: null reasoning as (tabs)/_layout.tsx's
          // emergency-contacts screen.
          href: null,
        }}
      />
      <Tabs.Screen
        name="language"
        options={{
          title: t('languageLabel'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="phone-number"
        options={{
          title: t('phonePlaceholder'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="safety-features"
        options={{
          title: t('safetyFeaturesLink'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="tutorial"
        options={{
          title: t('helpAndTutorialLink'),
          href: null,
        }}
      />
    </Tabs>
  );
}
