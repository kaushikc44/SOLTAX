// SolTax AU - Wallets Page
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WalletList } from '@/components/wallets/WalletList';
import { getWallets } from '@/lib/db/queries';

export default async function WalletsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/wallets');
  }

  // Fetch user's wallets
  const walletsResult = await getWallets(user.id);
  const wallets = walletsResult.data || [];

  const handleAddWallet = async (data: { address: string; label?: string }) => {
    'use server';
    // Would call createWallet from lib/db/queries
    console.log('Adding wallet:', data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallets</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your connected Solana wallets
        </p>
      </div>

      <Suspense fallback={<div>Loading wallets...</div>}>
        <WalletList
          wallets={wallets.map((w) => ({
            ...w,
            balanceSol: 0, // Would fetch actual balance
            transactionCount: 0, // Would fetch actual count
          }))}
          onAddWallet={handleAddWallet}
          onViewWallet={(wallet) => {
            // Navigate to wallet detail page
          }}
          onDeleteWallet={(walletId) => {
            // Would call deleteWallet
          }}
        />
      </Suspense>
    </div>
  );
}
