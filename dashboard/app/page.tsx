import Link from 'next/link';
import { publicCard, publicSubtitle, publicTitle } from '@/components/public-page-styles';
import { buttonClasses } from '@/components/ui/Button';

// Placeholder landing page — no routing/auth logic wired up yet.
export default function Home() {
  return (
    <main className={publicCard}>
      <h1 className={publicTitle}>SafePath Dashboard</h1>
      <p className={publicSubtitle}>Placeholder page — no content yet.</p>
      <nav className="flex flex-wrap gap-3">
        <Link href="/login" className={buttonClasses({ size: 'small' })}>
          Login
        </Link>
        <Link href="/dashboard" className={buttonClasses({ variant: 'secondary', size: 'small' })}>
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
