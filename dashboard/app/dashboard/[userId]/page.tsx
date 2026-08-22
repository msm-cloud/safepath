// Placeholder screen — a single at-risk user's detail/alert history will live here.
export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">User</h1>
      <p className="text-zinc-500">Placeholder page for user id: {userId}</p>
    </main>
  );
}
