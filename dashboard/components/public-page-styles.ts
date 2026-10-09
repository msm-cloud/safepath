// Class strings shared by the signed-out pages (sign-in, sign-up, password
// reset, guardian-only, landing). Each page is one centred card on the page
// background; the web has no background photos.

export const publicCard =
  'mx-4 my-6 flex flex-col gap-6 rounded-xl border-[1.5px] border-border bg-surface p-gutter shadow-sm sm:mx-auto sm:my-auto sm:w-full sm:max-w-md sm:p-10';

// Top row of the card, holding the language switch.
export const publicToolbar = 'flex justify-end';

export const publicTitle = 'type-h1 text-text';

export const publicSubtitle = 'type-body text-text-muted';

export const publicForm = 'flex w-full flex-col gap-3.5';

export const publicError = 'rounded-md bg-danger-soft px-4 py-3 type-body-sm text-on-danger-soft';

export const publicSuccess =
  'rounded-md bg-success-soft px-4 py-3 type-body-sm text-on-success-soft';

// Standalone link (not inside a sentence), e.g. "Forgot password?".
export const publicLink = 'type-label text-primary hover:text-primary-pressed';

// Sentence with an inline link, e.g. "No account? Sign up".
export const publicPrompt = 'text-center type-body-sm text-text-muted';

export const publicFootnote = 'text-center type-caption text-text-muted';

export const inlineLink = 'text-primary underline hover:text-primary-pressed';
