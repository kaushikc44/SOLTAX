// SolTax AU - Dashboard Layout
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Middleware already redirects unauthenticated users, but double-check here
  // so Server Components downstream can rely on `user` being defined.
  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        user={
          user
            ? {
                email: user.email,
                avatar: user.user_metadata?.avatar_url,
              }
            : undefined
        }
      />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="container px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
