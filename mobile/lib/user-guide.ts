import { Linking } from 'react-native';

// The manual is a public file in the project's `manuals` storage bucket,
// opened in the system browser.
const USER_GUIDE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/manuals/SafePath_User_Manual.pdf`;

export function openUserGuide(): void {
  void Linking.openURL(USER_GUIDE_URL);
}
