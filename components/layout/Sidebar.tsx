// SolTax AU - Sidebar Component
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Wallets', href: '/wallets', icon: Wallet },
  { name: 'Transactions', href: '/transactions', icon: FileText },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-white dark:bg-gray-900 min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-aus-green-50 text-aus-green-700 dark:bg-aus-green-900/20 dark:text-aus-green-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="bg-gradient-to-r from-aus-green-600 to-aus-green-700 rounded-lg p-4 text-white">
          <p className="text-sm font-medium">Need Help?</p>
          <p className="text-xs text-green-100 mt-1">
            Check our documentation for ATO guidance
          </p>
        </div>
      </div>
    </aside>
  );
}
