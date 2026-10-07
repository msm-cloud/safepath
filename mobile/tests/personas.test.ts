// Tests for matching welcome-screen personas to profiles.role, including the
// session-restore path that runs without a card. Run with `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  devicePersonaForRole,
  personaForRole,
  personaMatchesRole,
  resolveSessionRole,
} from '../lib/personas.ts';

describe('personas: card against role', () => {
  it('accepts student and working woman for a user account (persona is device-only)', () => {
    assert.equal(personaMatchesRole('student', 'user'), true);
    assert.equal(personaMatchesRole('working', 'user'), true);
  });

  it('accepts only the guardian card for a guardian account', () => {
    assert.equal(personaMatchesRole('guardian', 'guardian'), true);
    assert.equal(personaMatchesRole('student', 'guardian'), false);
    assert.equal(personaMatchesRole('working', 'guardian'), false);
  });

  it('refuses the guardian card for a user account', () => {
    assert.equal(personaMatchesRole('guardian', 'user'), false);
  });

  it('offers the card that fits the account', () => {
    assert.equal(personaForRole('guardian'), 'guardian');
    assert.equal(personaForRole('user'), 'student');
  });
});

describe('personas: session restore', () => {
  it('routes by the server role when it is available', () => {
    assert.equal(resolveSessionRole('guardian', 'user'), 'guardian');
  });

  it('routes by the cached role when the server is unreachable', () => {
    assert.equal(resolveSessionRole(null, 'guardian'), 'guardian');
  });

  it('falls back to user only with neither', () => {
    assert.equal(resolveSessionRole(null, null), 'user');
  });

  it('ignores a saved persona that does not fit the role', () => {
    assert.equal(devicePersonaForRole('student', 'guardian'), null);
    assert.equal(devicePersonaForRole('guardian', 'user'), null);
  });

  it('keeps a saved persona that fits the role', () => {
    assert.equal(devicePersonaForRole('working', 'user'), 'working');
    assert.equal(devicePersonaForRole('student', 'user'), 'student');
    assert.equal(devicePersonaForRole('guardian', 'guardian'), 'guardian');
    assert.equal(devicePersonaForRole(null, 'user'), null);
  });
});
