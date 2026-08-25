import * as Notifications from 'expo-notifications';

// Local device notifications only (expo-notifications' scheduling API, not
// a push notification) — a helpful reminder to check in, not the actual
// safety mechanism. The real safety net is the server-side
// check_overdue_journeys() cron job (see
// supabase/migrations/20260825133138_journeys.sql), which fires a real SOS
// alert regardless of whether this notification is ever seen, delivered,
// or acted on. Both functions here are best-effort and never throw — a
// failure to schedule/cancel a local reminder should never block starting
// or resolving a journey.

export async function scheduleArrivalCheckNotification(params: {
  title: string;
  body: string;
  fireAt: Date;
}): Promise<string | null> {
  try {
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
  } catch {
    return null;
  }
}

export async function cancelScheduledNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Best-effort — if this fails the notification may still fire, but
    // that's just a slightly-late reminder, not a safety issue (the cron
    // job is the actual mechanism and knows independently that this
    // journey was resolved).
  }
}
