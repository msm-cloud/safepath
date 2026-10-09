'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import Banner from '@/components/ui/Banner';
import { useLanguage } from '@/lib/language-context';

const RETRY_DELAYS_MS = [5000, 10000, 20000, 30000];

// Shown when the server couldn't check the session. Re-runs the server
// render with backoff instead of reloading, so client state on the page
// (an active SOS card, its alarm, live sharing) stays as it is. Once the
// check succeeds the layout stops rendering this; if the session turns out
// to be invalid the layout redirects to /login.
export default function ConnectionProblem() {
  const { t } = useLanguage();
  const router = useRouter();
  const [retries, setRetries] = useState(0);
  const [retrying, startRetry] = useTransition();

  const retry = useCallback(() => {
    startRetry(() => router.refresh());
    setRetries((count) => count + 1);
  }, [router]);

  // Each retry, automatic or from the button, restarts the countdown.
  useEffect(() => {
    const id = setTimeout(retry, RETRY_DELAYS_MS[Math.min(retries, RETRY_DELAYS_MS.length - 1)]);
    return () => clearTimeout(id);
  }, [retries, retry]);

  return (
    <Banner
      tone="warning"
      title={t('connectionProblemTitle')}
      action={
        <button type="button" onClick={retry} disabled={retrying} className="underline">
          {retrying ? t('connectionRetrying') : t('connectionRetryButton')}
        </button>
      }
    >
      {t('connectionProblemMessage')}
    </Banner>
  );
}
