import { Stack, useRouter } from 'expo-router';

import EmptyState from '@/components/ui/EmptyState';
import Screen from '@/components/ui/Screen';
import { useLanguage } from '@/lib/language-context';

export default function NotFoundScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: t('notFoundTitle') }} />
      <Screen edges={['bottom']} scroll={false} contentStyle={{ justifyContent: 'center' }}>
        <EmptyState
          icon={{ ios: 'questionmark.folder', android: 'explore_off', web: 'explore_off' }}
          tone="neutral"
          title={t('notFoundMessage')}
          action={{ label: t('goToHomeLink'), onPress: () => router.replace('/') }}
        />
      </Screen>
    </>
  );
}
