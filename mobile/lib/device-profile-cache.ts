import AsyncStorage from '@react-native-async-storage/async-storage';

import { createProfileCache } from '@/lib/profile-cache';

export const profileCache = createProfileCache(AsyncStorage);
