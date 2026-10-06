// Tests for the invite code helpers (display format and 24-hour expiry).
// Run with `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatInviteCode,
  INVITE_CODE_TTL_MS,
  inviteCodeExpiresAt,
  isInviteCodeExpired,
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
