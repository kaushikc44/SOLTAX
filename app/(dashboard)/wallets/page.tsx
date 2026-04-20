// SolTax AU - Wallets Page
// Real data via /api/wallets. Add flow respects the free-tier cap — 402 from
// the server opens the UpgradeModal.

'use client';

import { useEffect, useState } from 'react';
import { WalletList } from '@/components/wallets/WalletList';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import type { Wallet } from '@/types';

interface WalletWithBalance extends Wallet {
  balanceSol?: number;
  transactionCount?: number;
}

interface SubscriptionStatus {
  tier: 'free' | 'pro';
  walletsUsed: number;
  walletLimit: number;
  upgrade: { priceSol: number; treasuryWallet: string };
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchWalletBalance = async (address: string) => {
    try {
      const res = await fetch('/api/solana/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, includeRecentTx: false }),
      });
      if (!res.ok) throw new Error('Failed to fetch wallet data');
      const json = await res.json();
      return {
        balanceSol: json.data?.balanceSol || 0,
        transactionCount: json.data?.transactionCount || 0,
      };
    } catch {
      return { balanceSol: 0, transactionCount: 0 };
    }
  };

  const loadAll = async () => {
    const [walletsRes, statusRes] = await Promise.all([
      fetch('/api/wallets').then((r) => r.json()).catch(() => ({ wallets: [] })),
      fetch('/api/subscription/status').then((r) => r.json()).catch(() => null),
    ]);

    const base: Wallet[] = walletsRes?.wallets ?? [];
    const withBalances: WalletWithBalance[] = await Promise.all(
      base.map(async (w) => ({
        ...w,
        ...(await fetchWalletBalance(w.address)),
      }))
    );
    setWallets(withBalances);
    setStatus(statusRes ?? null);
  };

  useEffect(() => {
    setIsLoading(true);
    loadAll().finally(() => setIsLoading(false));
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAll();
    setIsRefreshing(false);
  };

  const handleAddWallet = async (data: { address: string; label?: string }) => {
    setAddError('');
    const res = await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.status === 402) {
      setUpgradeOpen(true);
      return;
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAddError(json?.error || 'Could not add wallet.');
      throw new Error(json?.error || 'Could not add wallet');
    }
    await loadAll();
  };

  const handleDelete = async (walletId: string) => {
    await fetch(`/api/wallets?id=${walletId}`, { method: 'DELETE' });
    await loadAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallets</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {status
              ? `${status.walletsUsed}/${status.walletLimit} wallets · ${status.tier === 'pro' ? 'Pro' : 'Free tier'}`
              : 'Manage your connected Solana wallets with real-time balances'}
          </p>
        </div>
        {status?.tier === 'free' && (
          <button
            onClick={() => setUpgradeOpen(true)}
            className="text-sm font-medium text-aus-green-700 hover:underline"
          >
            Upgrade to Pro →
          </button>
        )}
      </div>

      {addError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {addError}
        </div>
      )}

      <WalletList
        wallets={wallets}
        onAddWallet={handleAddWallet}
        onDeleteWallet={handleDelete}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {status && (
        <UpgradeModal
          isOpen={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          onUpgraded={loadAll}
          priceSol={status.upgrade.priceSol}
          treasuryWallet={status.upgrade.treasuryWallet}
          proLimit={50}
        />
      )}
    </div>
  );
}
