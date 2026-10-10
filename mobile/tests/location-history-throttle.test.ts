// Tests for the location-history snapshot throttle. Run with
// `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isSnapshotDue,
  SNAPSHOT_INTERVAL_MS,
  snapshotTime,
} from '../lib/location-history-throttle.ts';

const MIN = 60 * 1000;
const T0 = Date.parse('2026-10-10T13:33:21.000Z');

describe('snapshotTime', () => {
  it("is the fix's own time", () => {
    assert.equal(snapshotTime(T0, T0 + 2 * MIN), T0);
  });

  it('is never later than now', () => {
    assert.equal(snapshotTime(T0 + MIN, T0), T0);
  });
});

describe('isSnapshotDue', () => {
  it('records the first fix', () => {
    assert.equal(isSnapshotDue(T0, 0), true);
  });

  it('records a fix one interval after the last', () => {
    assert.equal(isSnapshotDue(T0 + SNAPSHOT_INTERVAL_MS, T0), true);
  });

  it('allows a fix that lands a little early', () => {
    assert.equal(isSnapshotDue(T0 + SNAPSHOT_INTERVAL_MS - 20 * 1000, T0), true);
  });

  it('skips a fix well inside the interval', () => {
    assert.equal(isSnapshotDue(T0 + 2 * MIN, T0), false);
  });

  // 19:38:21 fix handled at 19:40:20, next fix at 19:43:21: spacing is
  // measured from the 19:38:21 fix, so the 19:43:21 one is recorded.
  it('keeps the 5-minute cadence when a batch reaches JS late', () => {
    const lateBatchFix = snapshotTime(T0 + 5 * MIN, T0 + 7 * MIN);
    assert.equal(isSnapshotDue(T0 + 10 * MIN, lateBatchFix), true);
  });

  it('skips an older fix delivered after a newer one', () => {
    assert.equal(isSnapshotDue(T0 - MIN, T0), false);
  });
});
