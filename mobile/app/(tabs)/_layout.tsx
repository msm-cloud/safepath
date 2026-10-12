import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/theme';
import { tabBarScreenOptions } from '@/theme/navigation';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        ...tabBarScreenOptions(colors),
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('homeTitle'),
          // Home draws its own greeting header, as on the boards.
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: t('sosTitle'),
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
        name="contacts"
        options={{
          // Emergency contacts land in this tab too, in a later step —
          // title stays scoped to what's actually here for now.
          title: t('guardiansTitle'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.2.fill', android: 'people', web: 'people' }}
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
        name="guardian-location"
        options={{
          title: t('studentGuardianLocationTitle'),
          // Reachable from the Guardians tab, not its own tab — same
          // href: null reasoning as emergency-contacts below.
          href: null,
        }}
      />
      <Tabs.Screen
        name="remove-guardian"
        options={{
          title: t('guardiansTitle'),
          // Reached from the Guardians tab; same href: null reasoning as
          // emergency-contacts below.
          href: null,
        }}
      />
      <Tabs.Screen
        name="guardian-request"
        options={{
          title: t('guardianRequestTitle'),
          // Opened from the Guardians tab; same href: null reasoning as
          // emergency-contacts below.
          href: null,
        }}
      />
      <Tabs.Screen
        name="emergency-contacts"
        options={{
          title: t('emergencyContactsTitle'),
          // Reachable from Settings via router.push(), not its own tab —
          // href: null is Expo Router's documented way to keep a screen
          // inside a tab group (so it inherits the same auth-protected
          // Stack.Protected wrapping as the rest of (tabs)) without it
          // showing up in the tab bar itself.
          href: null,
        }}
      />
      <Tabs.Screen
        name="change-password"
        options={{
          title: t('changePasswordLink'),
          // Same href: null reasoning as emergency-contacts above.
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
        name="fake-call"
        options={{
          title: t('fakeCallSetupTitle'),
          // Opened from the Home tile.
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
