// The location-history snapshot throttle, with no Expo or Supabase
// dependency so `pnpm test:mobile` can load it directly.

// One snapshot per 5 minutes, from either write path.
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

// Slack on the throttle check. The OS delivers the 5-minute task updates
// with a little jitter either way, so a strict `< SNAPSHOT_INTERVAL_MS`
// check drops any fix that lands just early and the next write waits for
// the following update — a 10-minute gap instead of 5.
const SNAPSHOT_THROTTLE_SLACK_MS = 30 * 1000;

// The time a fix counts as taken: its own timestamp, never later than now,
// so a fix stamped in the future can't hold back the ones after it.
export function snapshotTime(fixTimestamp: number, now: number): number {
  return Math.min(fixTimestamp, now);
}

// Spacing is measured between fixes, not between the moments the handler
// ran. Android can hand a batch to JS minutes after the fix was taken;
// measuring from then would drop the next on-time fix.
export function isSnapshotDue(fixTime: number, lastSnapshotTime: number): boolean {
  return fixTime - lastSnapshotTime >= SNAPSHOT_INTERVAL_MS - SNAPSHOT_THROTTLE_SLACK_MS;
}
