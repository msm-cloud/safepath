import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/lib/language-context';

export default function NotFoundScreen() {
  const { t } = useLanguage();

  return (
    <>
      <Stack.Screen options={{ title: t('notFoundTitle') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('notFoundMessage')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('goToHomeLink')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
