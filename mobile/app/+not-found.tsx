import { Stack, useRouter } from 'expo-router';

import EmptyState from '@/components/ui/EmptyState';
import Screen from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function NotFoundScreen() {
  const { t } = useLanguage();
  const { session, role } = useAuth();
  const router = useRouter();

  // A bare '/' resolves to the first group's index, (auth), which the root
  // Stack.Protected rejects for a signed-in user — so target the group the
  // current user is actually allowed into.
  const homeHref = !session ? '/(auth)' : role === 'guardian' ? '/(guardian)' : '/(tabs)';

  return (
    <>
      <Stack.Screen options={{ title: t('notFoundTitle') }} />
      <Screen edges={['bottom']} scroll={false} contentStyle={{ justifyContent: 'center' }}>
        <EmptyState
          icon={{ ios: 'questionmark.folder', android: 'explore_off', web: 'explore_off' }}
          tone="neutral"
          title={t('notFoundMessage')}
          action={{ label: t('goToHomeLink'), onPress: () => router.dismissTo(homeHref) }}
        />
      </Screen>
    </>
  );
}
