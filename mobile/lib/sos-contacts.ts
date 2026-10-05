import AsyncStorage from '@react-native-async-storage/async-storage';

import { isOnline } from '@/lib/network';
import { createSosContactsStore, type SosContacts } from '@/lib/sos-contacts-cache';
import { supabase } from '@/lib/supabase';

async function fetchRemote(userId: string): Promise<SosContacts | null> {
  const [contactsResult, profileResult] = await Promise.all([
    supabase.from('emergency_contacts').select('id, name, phone').eq('user_id', userId),
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
  ]);
  if (contactsResult.error || !contactsResult.data || profileResult.error) return null;
  return { contacts: contactsResult.data, fullName: profileResult.data?.full_name ?? null };
}

const store = createSosContactsStore({ storage: AsyncStorage, isOnline, fetchRemote });

// Emergency contacts and display name for the SOS screen and shake listener,
// falling back to the on-device copy when offline.
export const loadSosContacts = store.load;
export const clearSosContactsCache = store.clear;
