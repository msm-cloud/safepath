// Tests for the fake call setup screen's preselection rules. Run with
// `pnpm test:mobile`.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  callerFromSavedName,
  initialPrefs,
  otherNameFromSaved,
  parseStoredPrefs,
  type PresetCallerLabels,
} from '../lib/fake-call.ts';

const LABELS: PresetCallerLabels = {
  ammu: ['Ammu', 'আম্মু'],
  abbu: ['Abbu', 'আব্বু'],
};

describe('fake call: caller from the saved name', () => {
  it('selects Ammu when nothing is saved', () => {
    assert.equal(callerFromSavedName(null, LABELS), 'ammu');
    assert.equal(callerFromSavedName('   ', LABELS), 'ammu');
  });

  it('matches a preset label in either language, ignoring case and spaces', () => {
    assert.equal(callerFromSavedName(' ammu ', LABELS), 'ammu');
    assert.equal(callerFromSavedName('আব্বু', LABELS), 'abbu');
    assert.equal(callerFromSavedName('ABBU', LABELS), 'abbu');
  });

  it('selects Other name for any other saved name and fills it in', () => {
    assert.equal(callerFromSavedName('Rina Apa', LABELS), 'other');
    assert.equal(otherNameFromSaved(' Rina Apa ', LABELS), 'Rina Apa');
  });

  it('leaves the other name empty when the saved name is a preset', () => {
    assert.equal(otherNameFromSaved('আম্মু', LABELS), '');
    assert.equal(otherNameFromSaved(null, LABELS), '');
  });
});

describe('fake call: initial choices', () => {
  it('prefers the choices stored on the device', () => {
    assert.deepEqual(initialPrefs({ caller: 'abbu', ringOutLoud: false }, 'Rina Apa', LABELS), {
      caller: 'abbu',
      ringOutLoud: false,
    });
  });

  it('falls back to the saved name and rings out loud by default', () => {
    assert.deepEqual(initialPrefs(null, 'Rina Apa', LABELS), {
      caller: 'other',
      ringOutLoud: true,
    });
    assert.deepEqual(initialPrefs({ ringOutLoud: false }, null, LABELS), {
      caller: 'ammu',
      ringOutLoud: false,
    });
  });
});

describe('fake call: stored preferences', () => {
  it('reads valid preferences', () => {
    assert.deepEqual(parseStoredPrefs('{"caller":"other","ringOutLoud":false}'), {
      caller: 'other',
      ringOutLoud: false,
    });
  });

  it('drops unknown or malformed fields', () => {
    assert.deepEqual(parseStoredPrefs('{"caller":"boss","ringOutLoud":"yes"}'), {});
    assert.equal(parseStoredPrefs('not json'), null);
    assert.equal(parseStoredPrefs('null'), null);
    assert.equal(parseStoredPrefs(null), null);
  });
});
