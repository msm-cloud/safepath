import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useEffect, useRef } from 'react';

// Update rate for the accelerometer subscription. 100ms (10Hz) is frequent
// enough to catch a real shake's direction changes without draining the
// battery the way a much higher rate would.
const UPDATE_INTERVAL_MS = 100;

// A shake is detected as a PATTERN, not a single jolt — deliberately
// biased toward fewer false positives over faster response, given the
// cost of an accidental real SOS to a guardian. On each accelerometer
// reading we compute the change in acceleration magnitude since the last
// reading; a "jolt" is counted when that change crosses JOLT_THRESHOLD_G,
// at most one jolt per JOLT_COOLDOWN_MS (so one continuous swing isn't
// double/triple-counted as several). A genuine shake needs
// JOLTS_REQUIRED distinct jolts within SHAKE_WINDOW_MS of each other —
// ordinary phone handling (picking it up, walking, setting it down) very
// rarely produces several sharp direction changes in quick succession the
// way a deliberate shake does.
//
// These exact thresholds are a starting point, not tuned against a real
// device — needs a live device test to confirm the gesture actually feels
// right and doesn't false-trigger during normal use (see PR description).
const JOLT_THRESHOLD_G = 1.8;
const JOLT_COOLDOWN_MS = 150;
const SHAKE_WINDOW_MS = 1400;
const JOLTS_REQUIRED = 4;

// Detects a shake gesture pattern while `enabled` is true, calling
// `onShake` at most once per detected pattern (jolt history resets after
// firing, so a single continuous shake can't fire repeatedly). Does
// nothing at all — no subscription exists — while `enabled` is false, so
// callers can gate this on both auth state and the user's own Settings
// toggle without the sensor ever being touched when either is off.
export function useShakeDetector(onShake: () => void, enabled: boolean) {
  const onShakeRef = useRef(onShake);
  // Keeps the ref pointing at the latest onShake without re-subscribing
  // the accelerometer listener whenever the caller passes a new function
  // reference. A plain assignment during render is flagged by
  // react-hooks/refs (mutating a ref outside an effect/handler); this
  // no-dependency-array effect is React's own recommended way to keep a
  // ref fresh after every render instead.
  useEffect(() => {
    onShakeRef.current = onShake;
  });

  useEffect(() => {
    if (!enabled) return;

    let lastMagnitude: number | null = null;
    let lastJoltAt = 0;
    let joltTimestamps: number[] = [];

    const handleReading = ({ x, y, z }: AccelerometerMeasurement) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (lastMagnitude !== null) {
        const delta = Math.abs(magnitude - lastMagnitude);

        if (delta > JOLT_THRESHOLD_G && now - lastJoltAt > JOLT_COOLDOWN_MS) {
          lastJoltAt = now;
          joltTimestamps.push(now);
          joltTimestamps = joltTimestamps.filter((t) => now - t <= SHAKE_WINDOW_MS);

          if (joltTimestamps.length >= JOLTS_REQUIRED) {
            joltTimestamps = [];
            onShakeRef.current();
          }
        }
      }

      lastMagnitude = magnitude;
    };

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(handleReading);

    return () => {
      subscription.remove();
    };
  }, [enabled]);
}
