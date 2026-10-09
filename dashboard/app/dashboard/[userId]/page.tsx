// Placeholder screen — a single at-risk user's detail/alert history will live here.
export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-gutter py-6 lg:px-8 lg:py-8">
      <h1 className="type-h1 text-text">User</h1>
      <p className="type-body text-text-muted">Placeholder page for user id: {userId}</p>
    </main>
  );
}
