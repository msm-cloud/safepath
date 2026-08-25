import * as SMS from 'expo-sms';

import { getBestEffortLocation } from '@/lib/location';
import { isOnline } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

// The actual "create an SOS alert" logic — extracted out of
// app/(tabs)/sos.tsx so the shake-to-trigger feature can call the exact
// same function the hold button uses, instead of a second, possibly-
// diverging copy of it. This module is UI-agnostic (no React state) —
// callers own their own phase/activeAlert/errorMessage display and pass
// in whatever they've already got cached. Every field, branch, and
// message here is byte-for-byte the same behavior sos.tsx had before this
// extraction; only the location moved, and success/failure is now
// reported via a return value instead of local setState calls.

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
};

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type SosTriggerResult =
  | { mode: 'created'; alert: { id: string; createdAt: string } }
  | { mode: 'offline_sms_sent' }
  | { mode: 'failed'; message: string };

// --- Online path: unchanged behavior from before offline support (and
// now this extraction) was added — same insert, same fields, same success
// shape. Returns null on failure instead of setting error state directly,
// so the orchestrator below can fall back to the offline SMS path instead
// of just reporting an error.
export async function triggerSosOnline(
  userId: string
): Promise<{ id: string; createdAt: string } | null> {
  const location = await getBestEffortLocation();

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: userId,
      status: 'active',
      trigger_type: 'manual',
      last_lat: location?.lat ?? null,
      last_lng: location?.lng ?? null,
    })
    .select('id, created_at')
    .single();

  if (error || !data) return null;
  return { id: data.id, createdAt: data.created_at };
}

// --- Offline path: reached when there's no network, or when the online
// insert above failed despite a network being reported present (e.g. a
// blip). Never attempts a Supabase call — instead opens the native SMS
// composer addressed to every saved emergency contact. Uses its own
// independent location lookup (deliberately not shared with
// triggerSosOnline above) to keep that function's internals untouched.
export async function triggerSosOffline(params: {
  reason: 'offline' | 'insert_failed';
  emergencyContacts: EmergencyContact[] | null;
  fullName: string | null;
  t: Translate;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { reason, emergencyContacts, fullName, t } = params;

  if (!emergencyContacts || emergencyContacts.length === 0) {
    return {
      ok: false,
      message:
        reason === 'offline' ? t('offlineNoContactsMessage') : t('insertFailedNoContactsMessage'),
    };
  }

  const available = await SMS.isAvailableAsync();
  if (!available) {
    return { ok: false, message: t('smsNotAvailableMessage') };
  }

  const location = await getBestEffortLocation();
  const locationText = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : t('emergencySmsLocationUnavailable');

  const message = t('emergencySmsMessage', {
    name: fullName?.trim() || t('emergencySmsNameFallback'),
    time: new Date().toLocaleTimeString(),
    location: locationText,
  });

  await SMS.sendSMSAsync(
    emergencyContacts.map((contact) => contact.phone),
    message
  );

  // No retry queue, no "was it actually sent" tracking — the native SMS
  // composer requires the user's own tap on Send (a platform restriction
  // on both iOS and Android), so once it's been handed off this is the
  // complete offline action.
  return { ok: true };
}

// The single entry point both the hold button (app/(tabs)/sos.tsx) and
// the shake-to-trigger listener (components/ShakeSosListener.tsx) call.
export async function triggerSos(params: {
  userId: string;
  emergencyContacts: EmergencyContact[] | null;
  fullName: string | null;
  t: Translate;
}): Promise<SosTriggerResult> {
  const { userId, emergencyContacts, fullName, t } = params;

  const online = await isOnline();

  if (online) {
    const alert = await triggerSosOnline(userId);
    if (alert) return { mode: 'created', alert };
    // Insert failed despite a network being reported present — fall back
    // to the offline SMS path rather than just reporting an error.
    const offlineResult = await triggerSosOffline({
      reason: 'insert_failed',
      emergencyContacts,
      fullName,
      t,
    });
    return offlineResult.ok
      ? { mode: 'offline_sms_sent' }
      : { mode: 'failed', message: offlineResult.message };
  }

  const offlineResult = await triggerSosOffline({
    reason: 'offline',
    emergencyContacts,
    fullName,
    t,
  });
  return offlineResult.ok
    ? { mode: 'offline_sms_sent' }
    : { mode: 'failed', message: offlineResult.message };
}
