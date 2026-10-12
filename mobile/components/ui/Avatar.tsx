import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { View } from 'react-native';

import { useSignedAvatarUrl } from '@/lib/use-signed-avatar-url';
import { useTheme, type ThemeColors } from '@/theme';

import Text from './Text';

// Profile photo for students and guardians. Given the stored
// profiles.avatar_url path (a bucket path, not a URL), it shows, in order:
//   1. the photo, via a signed URL minted from the private bucket (or one
//      already signed elsewhere, passed as signedUrl)
//   2. initials from `name` on a colour picked from that name, so a person
//      keeps the same colour everywhere
//   3. a generic person glyph when there is no photo and no name
//
// Presentational only; uploads live in lib/avatar-upload.ts.

type Tone = { bg: keyof ThemeColors; fg: keyof ThemeColors };

// The banner tone pairs, so every initials colour is already covered by
// scripts/check-contrast.ts in both schemes. Danger is left out: a red
// avatar next to an alert would read as part of the alert.
const INITIALS_TONES: Tone[] = [
  { bg: 'primarySoft', fg: 'onPrimarySoft' },
  { bg: 'successSoft', fg: 'onSuccessSoft' },
  { bg: 'warningSoft', fg: 'onWarningSoft' },
  { bg: 'infoSoft', fg: 'onInfoSoft' },
];

function initialsFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  const initials = (first + last).toUpperCase();
  return initials || null;
}

function toneFromName(name: string): Tone {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return INITIALS_TONES[Math.abs(hash) % INITIALS_TONES.length];
}

export type AvatarProps = {
  name: string | null | undefined;
  // The stored profiles.avatar_url value.
  url?: string | null;
  // A URL another service already signed, used instead of url. It may
  // expire while the screen is open; the fallback below covers that.
  signedUrl?: string | null;
  size: number;
};

export default function Avatar({ name, url, signedUrl, size }: AvatarProps) {
  const { colors } = useTheme();
  const mintedUrl = useSignedAvatarUrl(signedUrl ? null : (url ?? null));
  const imageUrl = signedUrl ?? mintedUrl;
  // A photo that fails to load shows the initials, never a broken image.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = initialsFromName(name);
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (imageUrl && imageUrl !== failedUrl) {
    return (
      <Image
        // The bucket path is stable while the signed URL's token changes on
        // every mint, so caching by path keeps the disk cache warm and a
        // replaced photo (new path) still busts it.
        source={{ uri: imageUrl, cacheKey: signedUrl ? undefined : (url ?? undefined) }}
        style={[circle, { backgroundColor: colors.track }]}
        contentFit="cover"
        transition={150}
        onError={() => setFailedUrl(imageUrl)}
      />
    );
  }

  const tone = initials && name ? toneFromName(name) : null;

  return (
    <View
      style={[
        circle,
        {
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: tone ? colors[tone.bg] : colors.track,
        },
      ]}
    >
      {tone ? (
        <Text
          variant="label"
          // The circle has a fixed size, so the initials must not grow with
          // the system font scale.
          allowFontScaling={false}
          style={{ color: colors[tone.fg], fontSize: size * 0.4, lineHeight: size * 0.52 }}
        >
          {initials}
        </Text>
      ) : (
        <SymbolView
          name={{ ios: 'person.fill', android: 'person', web: 'person' }}
          tintColor={colors.textMuted}
          size={size * 0.55}
        />
      )}
    </View>
  );
}
