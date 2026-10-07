import type { TranslationKey } from '@/lib/translations';

// Who the person says they are on the welcome screen. Only `role` is saved:
// "Working woman" is wording for now and creates a normal user account.
export type Persona = 'student' | 'working' | 'guardian';

export const PERSONAS: Persona[] = ['student', 'working', 'guardian'];

export const DEFAULT_PERSONA: Persona = 'student';

// profiles.role, the source of truth for which home an account gets.
export type ProfileRole = 'user' | 'guardian';

export function personaRole(persona: Persona): ProfileRole {
  return persona === 'guardian' ? 'guardian' : 'user';
}

// Student and working woman are both 'user' accounts, so either card signs
// in the same account; only the guardian card needs a guardian account.
export function personaMatchesRole(persona: Persona, role: ProfileRole): boolean {
  return personaRole(persona) === role;
}

// The card to offer when someone picked the wrong one for their account.
export function personaForRole(role: ProfileRole): Persona {
  return role === 'guardian' ? 'guardian' : DEFAULT_PERSONA;
}

export function roleMismatchMessage(
  role: ProfileRole
): Extract<TranslationKey, 'roleMismatchGuardian' | 'roleMismatchUser'> {
  return role === 'guardian' ? 'roleMismatchGuardian' : 'roleMismatchUser';
}

// A persona saved on the device is wording only; one that doesn't fit the
// account's role (e.g. left behind by another account) is ignored.
export function devicePersonaForRole(saved: Persona | null, role: ProfileRole): Persona | null {
  return saved !== null && personaMatchesRole(saved, role) ? saved : null;
}

// On session restore the server's role wins, then the last one cached on
// this device. Only with neither (first launch offline) does it fall back
// to 'user', the role that keeps SOS reachable.
export function resolveSessionRole(
  fetched: ProfileRole | null,
  cached: ProfileRole | null
): ProfileRole {
  return fetched ?? cached ?? 'user';
}

// Route params arrive as untrusted strings; anything unknown falls back to
// the default rather than failing.
export function parsePersona(value: string | string[] | undefined): Persona {
  return PERSONAS.find((persona) => persona === value) ?? DEFAULT_PERSONA;
}

export const PERSONA_LABEL: Record<Persona, TranslationKey> = {
  student: 'personaStudent',
  working: 'personaWorking',
  guardian: 'personaGuardian',
};

export const PERSONA_HINT: Record<Persona, TranslationKey> = {
  student: 'personaStudentHint',
  working: 'personaWorkingHint',
  guardian: 'personaGuardianHint',
};
