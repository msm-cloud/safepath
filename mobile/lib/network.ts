import * as Network from 'expo-network';

// Best-effort — treats an inability to determine network state as "online"
// (fails open toward attempting the real thing first). If expo-network
// itself throws or returns an unclear state, we'd rather try the online
// alert path and let a genuine failure there trigger the offline fallback
// than skip straight to SMS on a false negative.
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return true;
  }
}
