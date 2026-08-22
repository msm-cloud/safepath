import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@safepath/shared-types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project values.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // The JS client defaults to `localStorage`, which doesn't exist in React
    // Native — without an explicit adapter, sessions silently fail to
    // persist (or the client throws, depending on platform). AsyncStorage is
    // Supabase's own documented adapter for Expo/React Native.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No browser URL to parse a session out of on native.
    detectSessionInUrl: false,
  },
});
