import type { TranslationKey } from '@/lib/translations';

// The retention presets a student or guardian can pick for a link's
// recorded location history, in hours. The location_history_retention
// CHECK constraint bounds the column to 1..168; these are the only values
// the UI offers. Shared by the student's per-guardian control (Guardians
// screen) and the guardian's own "Recorded Location" screen.
export const RETENTION_PRESETS_HOURS = [6, 24, 72, 168] as const;

// Matches the column default and the coalesce(..., 24) fallback in the
// guardian SELECT policy / purge function.
export const DEFAULT_RETENTION_HOURS = 24;

export function retentionLabelKey(hours: number): TranslationKey {
  switch (hours) {
    case 6:
      return 'locationHistoryRetention6h';
    case 72:
      return 'locationHistoryRetention3d';
    case 168:
      return 'locationHistoryRetention7d';
    default:
      return 'locationHistoryRetention24h';
  }
}
