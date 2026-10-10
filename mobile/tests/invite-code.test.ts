// Tests for the invite code helpers (display format, input normalizing,
// 24-hour expiry and the refresh timer).
// Run with `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatInviteCode,
  INVITE_CODE_TTL_MS,
  inviteCodeExpiresAt,
  isInviteCodeExpired,
  msUntilEarliest,
  normalizeInviteCode,
} from '../lib/invite-code.ts';

const CREATED_AT = '2026-10-06T09:00:00.000Z';
const CREATED_MS = Date.parse(CREATED_AT);

describe('formatInviteCode', () => {
  it('splits an 8-character code into two groups of four', () => {
    assert.equal(formatInviteCode('K7Q92MXZ'), 'K7Q9 2MXZ');
  });

  it('leaves a code of any other length unchanged', () => {
    assert.equal(formatInviteCode('K7Q92MX'), 'K7Q92MX');
  });
});

describe('inviteCodeExpiresAt', () => {
  it('is 24 hours after the code was created', () => {
    assert.equal(INVITE_CODE_TTL_MS, 24 * 60 * 60 * 1000);
    assert.equal(inviteCodeExpiresAt(CREATED_AT).toISOString(), '2026-10-07T09:00:00.000Z');
  });
});

describe('isInviteCodeExpired', () => {
  it('is false just before the 24 hours are up', () => {
    assert.equal(isInviteCodeExpired(CREATED_AT, CREATED_MS + INVITE_CODE_TTL_MS - 1), false);
  });

  // The server accepts created_at > now() - 24h, so the code is already
  // unusable at exactly 24 hours.
  it('is true at exactly 24 hours', () => {
    assert.equal(isInviteCodeExpired(CREATED_AT, CREATED_MS + INVITE_CODE_TTL_MS), true);
  });

  it('is true for an older code', () => {
    assert.equal(isInviteCodeExpired(CREATED_AT, CREATED_MS + 30 * INVITE_CODE_TTL_MS), true);
  });
});

describe('normalizeInviteCode', () => {
  it('drops spaces and dashes and uppercases', () => {
    assert.equal(normalizeInviteCode(' k7q9 2mxz '), 'K7Q92MXZ');
    assert.equal(normalizeInviteCode('k7q9-2MXZ'), 'K7Q92MXZ');
    assert.equal(normalizeInviteCode('K7Q9	2MX-Z'), 'K7Q92MXZ');
  });

  it('returns an empty string for only separators', () => {
    assert.equal(normalizeInviteCode(' - '), '');
  });
});

describe('msUntilEarliest', () => {
  it('is null with no times', () => {
    assert.equal(msUntilEarliest([], CREATED_MS), null);
  });

  it('counts down to the earliest time', () => {
    const later = new Date(CREATED_MS + 5000).toISOString();
    const sooner = new Date(CREATED_MS + 2000).toISOString();
    assert.equal(msUntilEarliest([later, sooner], CREATED_MS), 2000);
  });

  it('skips times already past', () => {
    const ahead = new Date(CREATED_MS + 3000).toISOString();
    assert.equal(msUntilEarliest([CREATED_AT, ahead], CREATED_MS + 1000), 2000);
    assert.equal(msUntilEarliest([CREATED_AT], CREATED_MS + 1), null);
  });

  it('caps the delay at the largest setTimeout value', () => {
    const farOff = new Date(CREATED_MS + 60 * INVITE_CODE_TTL_MS).toISOString();
    assert.equal(msUntilEarliest([farOff], CREATED_MS), 2 ** 31 - 1);
  });
});
