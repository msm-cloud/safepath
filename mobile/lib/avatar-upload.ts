import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { forgetSignedAvatarUrl } from '@/lib/use-signed-avatar-url';

// UI-agnostic profile-photo pipeline (same split as lib/sos-trigger.ts):
// pick -> square-crop -> downscale -> upload to the private `avatars`
// bucket -> hand back the stored path. Callers own their own loading /
// error display and the profiles.avatar_url write (mirrors how phone is
// handled in SettingsScreen rather than in a context).

// Downscaled edge length. A 512px square JPEG at q0.7 lands well under
// the bucket's 2 MiB file_size_limit (20260830001400 migration).
const AVATAR_EDGE_PX = 512;
const AVATAR_JPEG_QUALITY = 0.7;

export type AvatarSource = 'camera' | 'library';

export type AvatarUploadResult =
  { ok: true; path: string } | { ok: false; reason: 'cancelled' | 'permission_denied' | 'failed' };

async function pick(source: AvatarSource): Promise<ImagePicker.ImagePickerResult | 'denied'> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return 'denied';
    return ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // compression happens in the manipulate step below
    });
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return 'denied';
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
}

async function toSquareJpeg(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  // Width only — the picker's allowsEditing + aspect [1, 1] already
  // delivered a square crop, so height follows the ratio and there's no
  // distortion risk if a device's crop UI ever hands back a near-square.
  context.resize({ width: AVATAR_EDGE_PX });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: AVATAR_JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

// A fresh filename per upload (not a fixed "avatar.jpg") so a replaced
// photo is a new bucket path — expo-image's cache is keyed on that path,
// so this is what makes "changed my photo" actually show the new photo
// rather than a stale cached one. The '<uid>/' prefix — the only thing
// the storage policies key on — is unchanged.
function newAvatarPath(userId: string): string {
  return `${userId}/avatar-${Date.now()}.jpg`;
}

export async function pickAndUploadAvatar(params: {
  userId: string;
  source: AvatarSource;
  previousPath?: string | null;
}): Promise<AvatarUploadResult> {
  const { userId, source, previousPath } = params;

  const picked = await pick(source);
  if (picked === 'denied') return { ok: false, reason: 'permission_denied' };
  if (picked.canceled || !picked.assets?.[0]) return { ok: false, reason: 'cancelled' };

  try {
    const jpegUri = await toSquareJpeg(picked.assets[0].uri);
    // fetch().arrayBuffer() is the reliable React Native path for a
    // file:// URI — a Blob from .blob() can upload as 0 bytes on Hermes.
    const bytes = await fetch(jpegUri).then((r) => r.arrayBuffer());

    const path = newAvatarPath(userId);
    const { error } = await supabase.storage.from('avatars').upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) return { ok: false, reason: 'failed' };

    // Best-effort cleanup of the file this one replaces — a leftover
    // object is harmless (nothing references it once avatar_url moves on)
    // and must never fail the upload the user just did.
    if (previousPath && previousPath !== path) {
      supabase.storage
        .from('avatars')
        .remove([previousPath])
        .then(() => forgetSignedAvatarUrl(previousPath));
    }

    return { ok: true, path };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export async function removeAvatar(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from('avatars').remove([path]);
  forgetSignedAvatarUrl(path);
  return !error;
}
