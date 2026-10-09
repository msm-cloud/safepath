// Aborts server-side Supabase requests that hang, so a slow network fails
// fast instead of holding the page for the OS-level TCP timeout.
export function timeoutFetch(ms: number): typeof fetch {
  return (input, init) => {
    const signal = init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(ms)])
      : AbortSignal.timeout(ms);
    return fetch(input, { ...init, signal });
  };
}
