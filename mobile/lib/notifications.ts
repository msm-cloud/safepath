// Local device notifications only (expo-notifications' scheduling API, not
// a push notification) — a helpful reminder to check in, not the actual
// safety mechanism. The real safety net is the server-side
// check_overdue_journeys() cron job (see
// supabase/migrations/20260825133138_journeys.sql), which fires a real SOS
// alert regardless of whether this notification is ever seen, delivered,
// or acted on.
//
// ANDROID + EXPO GO GOTCHA (traced, not assumed): expo-notifications runs
// an internal push-token auto-registration side effect the moment its
// module is evaluated — see
// node_modules/expo-notifications/src/DevicePushTokenAutoRegistration.fx.ts,
// which at import time unconditionally calls addPushTokenListener()
// (node_modules/expo-notifications/src/TokenEmitter.ts). That function
// starts with a call to warnOfExpoGoPushUsage()
// (node_modules/expo-notifications/src/warnOfExpoGoPushUsage.ts), which on
// Android throws — not just warns — when running inside Expo Go
// ("...Push notifications (remote notifications)...was removed from Expo
// Go..."). We never call any push-specific API ourselves anywhere in this
// file (only getPermissionsAsync / requestPermissionsAsync /
// scheduleNotificationAsync / cancelScheduledNotificationAsync — all
// local-only), but simply having a static `import * as Notifications from
// 'expo-notifications'` at the top of a module that's loaded on app start
// (the Home screen imports this file) evaluates that internal side effect
// eagerly — throwing on app load on Android in Expo Go, before any journey
// feature is even touched.
//
// Fixed by importing the module dynamically, inside each function, instead
// of statically at the top of this file. That both (a) defers evaluating
// expo-notifications until a journey is actually started/resolved instead
// of at app boot, and (b) — critically — makes the throw catchable: a
// dynamic import()'s module-evaluation failure rejects the returned
// promise, whereas a static import's failure crashes synchronously and
// can't be try/caught at all. Combined with the try/catch below, this
// makes the whole notification path fail safe for ANY reason on ANY
// platform/environment — logs a warning and continues rather than
// crashing, since a missing reminder should never be able to take down
// the app or block starting/resolving a journey.

export async function scheduleArrivalCheckNotification(params: {
  title: string;
  body: string;
  fireAt: Date;
}): Promise<string | null> {
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
