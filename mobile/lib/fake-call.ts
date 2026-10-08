// Caller and ring-mode choices for the fake call setup screen
// (app/(tabs)/fake-call.tsx). Kept free of React Native imports so the
// preselection rules can be tested under plain Node.

export type FakeCaller = 'ammu' | 'abbu' | 'other';

export const FAKE_CALLERS: readonly FakeCaller[] = ['ammu', 'abbu', 'other'];

export type FakeCallPrefs = {
  caller: FakeCaller;
  ringOutLoud: boolean;
};

// The Ammu and Abbu labels in every app language. A name saved from the
// old Settings field may be either, so both languages are matched.
export type PresetCallerLabels = Record<Exclude<FakeCaller, 'other'>, readonly string[]>;

const DEFAULT_CALLER: FakeCaller = 'ammu';
const DEFAULT_RING_OUT_LOUD = true;

function normalize(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function presetForName(
  name: string,
  labels: PresetCallerLabels
): Exclude<FakeCaller, 'other'> | null {
  const key = normalize(name);
  if (labels.ammu.some((label) => normalize(label) === key)) return 'ammu';
  if (labels.abbu.some((label) => normalize(label) === key)) return 'abbu';
  return null;
}

// profiles.fake_call_caller_name holds the last "Other name". A saved name
// that is really one of the presets selects that preset instead.
export function callerFromSavedName(
  savedName: string | null,
  labels: PresetCallerLabels
): FakeCaller {
  if (!savedName?.trim()) return DEFAULT_CALLER;
  return presetForName(savedName, labels) ?? 'other';
}

// The text the "Other name" field starts with: the saved name, unless it is
// one of the presets.
export function otherNameFromSaved(savedName: string | null, labels: PresetCallerLabels): string {
  if (!savedName?.trim()) return '';
  return presetForName(savedName, labels) ? '' : savedName.trim();
}

// The device's last choices win; without them the caller comes from the
// saved name and the ring mode from the default.
export function initialPrefs(
  stored: Partial<FakeCallPrefs> | null,
  savedName: string | null,
  labels: PresetCallerLabels
): FakeCallPrefs {
  return {
    caller: stored?.caller ?? callerFromSavedName(savedName, labels),
    ringOutLoud: stored?.ringOutLoud ?? DEFAULT_RING_OUT_LOUD,
  };
}

// Anything unreadable is dropped field by field, so a bad value never
// blocks the screen.
export function parseStoredPrefs(raw: string | null): Partial<FakeCallPrefs> | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { caller, ringOutLoud } = value as Record<string, unknown>;
  const prefs: Partial<FakeCallPrefs> = {};
  const knownCaller = FAKE_CALLERS.find((option) => option === caller);
  if (knownCaller) prefs.caller = knownCaller;
  if (typeof ringOutLoud === 'boolean') prefs.ringOutLoud = ringOutLoud;
  return prefs;
}
