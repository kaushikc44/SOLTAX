// SolTax AU - Transactions Page
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TransactionTable } from '@/components/dashboard/TransactionTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWallets, getTransactions } from '@/lib/db/queries';
import { Download, Filter } from 'lucide-react';

export default async function TransactionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/transactions');
  }

  // Fetch wallets and transactions
  const walletsResult = await getWallets(user.id);
  const wallets: any[] = walletsResult.data || [];

  // Fetch transactions for all wallets
  let allTransactions: any[] = [];
  for (const wallet of wallets) {
    const txResult = await getTransactions(wallet.id, { limit: 100 });
    allTransactions = [...allTransactions, ...(txResult.data || [])];
  }

  // Sort by date descending
  allTransactions.sort((a, b) =>
    new Date(b.block_time).getTime() - new Date(a.block_time).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View and manage your Solana transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Suspense fallback={<div>Loading transactions...</div>}>
        <TransactionTable transactions={allTransactions} />
      </Suspense>

      {allTransactions.length === 0 && wallets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No transactions found</CardTitle>
            <CardDescription>
              Fetch transactions from your connected wallets to see them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Fetch Transactions</Button>
          </CardContent>
        </Card>
      )}

      {wallets.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No wallets connected</CardTitle>
            <CardDescription>
              Connect a Solana wallet to start tracking transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/wallets'}>
              Add Wallet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
