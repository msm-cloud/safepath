import type { TranslationKey } from '@/lib/translations';

// Who the person says they are on the welcome screen. Only `role` is saved:
// "Working woman" is wording for now and creates a normal user account.
export type Persona = 'student' | 'working' | 'guardian';

export const PERSONAS: Persona[] = ['student', 'working', 'guardian'];

export const DEFAULT_PERSONA: Persona = 'student';

export function personaRole(persona: Persona): 'user' | 'guardian' {
  return persona === 'guardian' ? 'guardian' : 'user';
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
