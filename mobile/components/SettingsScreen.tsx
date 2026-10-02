import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, type AlertButton, Pressable, View } from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ListGroup from '@/components/ui/ListGroup';
import ListRow from '@/components/ui/ListRow';
import RoleBadge from '@/components/ui/RoleBadge';
import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import { useAuth } from '@/lib/auth-context';
import { type AvatarSource, pickAndUploadAvatar, removeAvatar } from '@/lib/avatar-upload';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { useUserSettings } from '@/lib/user-settings-context';
import { useTheme } from '@/theme';

const AVATAR_SIZE = 88;
const EDIT_BADGE_SIZE = 30;

// Shared between the student ((tabs)/settings.tsx) and guardian
// ((guardian)/settings.tsx) tab groups. Each setting lives on its own
// screen; this one only navigates there, plus the profile photo and sign
// out. Emergency contacts (students) and share location (guardians) are
// the only role-specific rows.

export default function SettingsScreen() {
  const { session, role, signOut } = useAuth();
  const { t, language } = useLanguage();
  const { colors, spacing } = useTheme();
  const { fullName, avatarPath, setAvatarPathLocal } = useUserSettings();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const userId = session?.user.id;

  const uploadAvatar = async (source: AvatarSource) => {
    if (!userId) return;
    setAvatarBusy(true);
    const result = await pickAndUploadAvatar({ userId, source, previousPath: avatarPath });

    if (!result.ok) {
      setAvatarBusy(false);
      if (result.reason === 'permission_denied') {
        Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedMessage'));
      } else if (result.reason === 'failed') {
        Alert.alert(t('photoUploadFailedMessage'));
      }
      // 'cancelled' — the person backed out of the picker, say nothing.
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: result.path })
      .eq('id', userId);
    setAvatarBusy(false);

    if (error) {
      Alert.alert(t('photoUploadFailedMessage'));
      return;
    }
    setAvatarPathLocal(result.path);
  };

  const confirmRemoveAvatar = () => {
    Alert.alert(t('removePhotoConfirmTitle'), t('removePhotoConfirmMessage'), [
      { text: t('cancelButton'), style: 'cancel' },
      {
        text: t('removePhotoButton'),
        style: 'destructive',
        onPress: async () => {
          if (!userId || !avatarPath) return;
          setAvatarBusy(true);
          await removeAvatar(avatarPath);
          const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', userId);
          setAvatarBusy(false);
          if (error) {
            Alert.alert(t('photoUploadFailedMessage'));
            return;
          }
          setAvatarPathLocal(null);
        },
      },
    ]);
  };

  const handleAvatarPress = () => {
    if (avatarBusy) return;
    const options: AlertButton[] = [
      { text: t('takePhotoButton'), onPress: () => uploadAvatar('camera') },
      { text: t('chooseFromLibraryButton'), onPress: () => uploadAvatar('library') },
      ...(avatarPath
        ? [
            {
              text: t('removePhotoButton'),
              style: 'destructive' as const,
              onPress: confirmRemoveAvatar,
            },
          ]
        : []),
      { text: t('cancelButton'), style: 'cancel' },
    ];
    Alert.alert(t('profilePhotoActionTitle'), undefined, options);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    // No navigation call needed: the session change is picked up by
    // AuthProvider, and Stack.Protected in the root layout redirects to
    // the (auth) group automatically.
  };

  return (
    <Screen edges={[]} contentStyle={{ gap: spacing.xl }}>
      <Card>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Pressable
            onPress={handleAvatarPress}
            disabled={avatarBusy}
            accessibilityRole="button"
            accessibilityLabel={t('profilePhotoActionTitle')}
            accessibilityState={{ busy: avatarBusy }}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, marginBottom: spacing.xs }}
          >
            <Avatar name={fullName} url={avatarPath} size={AVATAR_SIZE} />
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: EDIT_BADGE_SIZE,
                height: EDIT_BADGE_SIZE,
                borderRadius: EDIT_BADGE_SIZE / 2,
                borderWidth: 2,
                borderColor: colors.surface,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {avatarBusy ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <SymbolView
                  name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                  tintColor={colors.onPrimary}
                  size={14}
                />
              )}
            </View>
          </Pressable>
          {fullName ? (
            <Text variant="title" align="center">
              {fullName}
            </Text>
          ) : null}
          {session?.user.email && (
            <Text variant="caption" color="textMuted" align="center">
              {t('signedInAs', { email: session.user.email })}
            </Text>
          )}
          <RoleBadge style={{ alignSelf: 'center' }} />
        </View>
      </Card>

      <ListGroup>
        <ListRow
          title={t('languageLabel')}
          value={language === 'bn' ? t('languageBn') : t('languageEn')}
          icon={{ ios: 'globe', android: 'language', web: 'language' }}
          iconTone="primarySoft"
          onPress={() => router.push('/language')}
        />
        <ListRow
          title={t('phonePlaceholder')}
          icon={{ ios: 'phone.fill', android: 'phone', web: 'phone' }}
          iconTone="success"
          onPress={() => router.push('/phone-number')}
        />
        <ListRow
          title={t('changePasswordLink')}
          icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          onPress={() => router.push('/change-password')}
        />
      </ListGroup>

      <ListGroup>
        {role === 'user' && (
          <ListRow
            title={t('emergencyContactsLink')}
            icon={{ ios: 'person.2.fill', android: 'people', web: 'people' }}
            iconTone="warning"
            onPress={() => router.push('/emergency-contacts')}
          />
        )}
        {role === 'guardian' && (
          <ListRow
            title={t('guardianShareLocationLink')}
            icon={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }}
            iconTone="info"
            onPress={() => router.push('/share-location')}
          />
        )}
        <ListRow
          title={t('safetyFeaturesLink')}
          icon={{ ios: 'shield.fill', android: 'security', web: 'security' }}
          iconTone="danger"
          onPress={() => router.push('/safety-features')}
        />
        <ListRow
          title={t('helpAndTutorialLink')}
          icon={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }}
          iconTone="primarySoft"
          onPress={() => router.push('/tutorial')}
        />
      </ListGroup>

      <Button
        title={t('signOutButton')}
        variant="secondary"
        icon={{
          ios: 'rectangle.portrait.and.arrow.right',
          android: 'logout',
          web: 'logout',
        }}
        loading={signingOut}
        onPress={handleSignOut}
      />
    </Screen>
  );
}
