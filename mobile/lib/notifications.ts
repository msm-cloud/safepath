import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

// Local device notifications only (expo-notifications' scheduling API, not
// a push notification) — a helpful reminder to check in, not the actual
// safety mechanism. The real safety net is the server-side
// check_overdue_journeys() cron job (see
// supabase/migrations/20260825133138_journeys.sql), which fires a real SOS
// alert regardless of whether this notification is ever seen, delivered,
// or acted on.
//
// ANDROID + EXPO GO: fully traced, not assumed. Merely requiring
// 'expo-notifications' at all — static OR dynamic import, doesn't matter —
// crashes on Android inside Expo Go, even though we only ever call local
// scheduling functions (getPermissionsAsync / requestPermissionsAsync /
// scheduleNotificationAsync / cancelScheduledNotificationAsync). Two
// things compound to cause this:
//
// 1. node_modules/expo-notifications/build/index.js re-exports from
//    ./DevicePushTokenAutoRegistration.fx.js. A re-export like that is NOT
//    lazy — Metro requires the submodule the instant index.js itself is
//    required, whether or not the re-exported binding is ever used.
//    DevicePushTokenAutoRegistration.fx.js's top-level code
//    unconditionally calls addPushTokenListener()
//    (.../TokenEmitter.js), which opens with warnOfExpoGoPushUsage()
//    (.../warnOfExpoGoPushUsage.js) — and that *throws* (not just warns)
//    on Android specifically when running inside Expo Go.
//
// 2. That throw happens inside Metro's own module loader
//    (node_modules/metro-runtime/src/polyfills/require.js,
//    guardedLoadModule()), which catches it and calls
//    global.ErrorUtils.reportFatalError(e) directly — a native-level
//    fatal-error report, entirely outside normal JS exception/Promise
//    flow — and then returns `undefined` instead of re-throwing. That
//    means a dynamic import() of the package doesn't reject; it resolves
//    with near-empty debris ({ default: undefined }), which is why an
//    earlier version of this file that switched to a dynamic import still
//    crashed (via the untouchable native fatal-error report) while ALSO
//    logging an unrelated "undefined is not a function" from calling a
//    method that didn't actually exist on that debris object. No amount
//    of try/catch around the import call can fix this — the fatal error
//    fires before our Promise-based error handling ever runs.
//
// The only real fix is to never import 'expo-notifications' at all in
// this specific environment. isRunningInExpoGo() is the same guard the
// package uses internally, imported here from 'expo' directly — confirmed
// safe to import eagerly: it's literally the first line of
// expo-notifications' own index.js, evaluated successfully every time
// (the crash traced above comes from a *later*, unrelated re-export in
// that same file, not from this import).
function localNotificationsUnavailable(): boolean {
  return Platform.OS === 'android' && isRunningInExpoGo();
}

export async function scheduleArrivalCheckNotification(params: {
  title: string;
  body: string;
  fireAt: Date;
}): Promise<string | null> {
  if (localNotificationsUnavailable()) {
    console.warn(
      '[notifications] Skipping the "did you arrive safely?" reminder — expo-notifications is not usable in Expo Go on Android (see the comment at the top of mobile/lib/notifications.ts). Use a development build to enable it. This is only a convenience nudge; the server-side cron job remains the actual safety mechanism.'
    );
    return null;
  }

  try {
    const Notifications = await import('expo-notifications');

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== 'granted') return null;
    }

    return await Notifications.scheduleNotificationAsync({
      content: { title: params.title, body: params.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: params.fireAt,
      },
    });
  } catch (err) {
    console.warn(
      '[notifications] Could not schedule the "did you arrive safely?" reminder — continuing without it. This is only a convenience nudge; the server-side cron job is the actual safety mechanism and is unaffected.',
      err
    );
    return null;
  }
}

export async function cancelScheduledNotification(id: string | null): Promise<void> {
  if (!id) return;
  if (localNotificationsUnavailable()) return; // never successfully scheduled one in the first place

  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (err) {
    console.warn(
      '[notifications] Could not cancel the scheduled reminder — it may still fire late, but this is not a safety issue (the server-side cron job already knows independently that this journey was resolved).',
      err
    );
  }
}
