import Link from 'next/link';

// Placeholder landing page — no routing/auth logic wired up yet.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">SafePath Dashboard</h1>
      <p className="text-zinc-500">Placeholder page — no content yet.</p>
      <nav className="flex gap-4 text-sm underline">
        <Link href="/login">Login</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
    </main>
  );
}
