import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useSignedAvatarUrl } from '@/lib/use-signed-avatar-url';

// Shared profile-photo view for students and guardians. Given the stored
// profiles.avatar_url PATH (not a URL — see the migration comment), it
// renders, in order of preference:
//   1. the photo, via a signed URL minted from the private bucket
//   2. initials from `name`, on a colour deterministically hashed from
//      that same name (so a person keeps the same colour everywhere)
//   3. a generic person glyph, when there's no photo and no name
//
// Purely presentational — no upload logic here (see lib/avatar-upload.ts).

const INITIALS_PALETTE = [
  '#2f95dc',
  '#34c759',
  '#ff9500',
  '#af52de',
  '#ff2d55',
  '#5856d6',
  '#30b0c7',
  '#e0a800',
];

export function initialsFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  const initials = (first + last).toUpperCase();
  return initials || null;
}

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return INITIALS_PALETTE[Math.abs(hash) % INITIALS_PALETTE.length];
}

type AvatarProps = {
  name: string | null | undefined;
  /** The stored profiles.avatar_url value — a bucket path, not a full URL. */
  url: string | null | undefined;
  size: number;
};

export default function Avatar({ name, url, size }: AvatarProps) {
  const signedUrl = useSignedAvatarUrl(url ?? null);
  const initials = initialsFromName(name);
  const radius = size / 2;

  if (signedUrl) {
    return (
      <Image
        // cacheKey is the stable bucket path, not the volatile signed URL
        // (its token changes every mint) — so expo-image's disk cache
        // stays warm across sessions, and a replaced photo (new path)
        // busts it cleanly.
        source={{ uri: signedUrl, cacheKey: url ?? undefined }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#e1e1e6' }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  if (initials && name) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius, backgroundColor: colorFromName(name) },
        ]}
      >
        <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '600' }}>{initials}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: '#c7c7cc' },
      ]}
    >
      <SymbolView
        name={{ ios: 'person.fill', android: 'person', web: 'person' }}
        tintColor="#fff"
        size={size * 0.55}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
