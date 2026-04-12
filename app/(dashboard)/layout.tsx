// SolTax AU - Dashboard Layout
import { getCurrentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect to login if not authenticated
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
