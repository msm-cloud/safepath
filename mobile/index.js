// Custom entry point. Exists only so the live-location-sharing background
// task is registered on EVERY JavaScript launch of the app — including the
// headless launches the OS spins up purely to deliver a background
// location batch, where there is no UI and `app/_layout.tsx` (and the
// whole expo-router route tree) is never evaluated.
//
// mobile/lib/live-sharing.ts calls `TaskManager.defineTask(...)` at module
// scope. If that module is only reachable through `app/_layout.tsx`, the
// first background delivery arrives in a JS context where the task is
// undefined — and expo-task-manager's event handler then permanently
// unregisters it (`unregisterTaskAsync`), silently killing background
// sharing while `live_sharing_sessions.is_active` stays `true`. Importing
// it here, before `expo-router/entry`, means it is always defined first.
//
// `@expo/metro-runtime` stays the very first import (Fast Refresh on web
// depends on it — see expo-router/entry-classic).
import '@expo/metro-runtime';

import './lib/live-sharing';

import 'expo-router/entry';
