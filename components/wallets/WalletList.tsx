// SolTax AU - Wallet List Component
'use client';

import { useState } from 'react';
import { WalletCard } from '@/components/dashboard/WalletCard';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { WalletForm } from './WalletForm';
import type { Wallet } from '@/types';
import { Plus, RefreshCw } from 'lucide-react';

interface WalletListProps {
  wallets: (Wallet & {
    balanceSol?: number;
    transactionCount?: number;
  })[];
  onAddWallet: (data: { address: string; label?: string }) => Promise<void>;
  onViewWallet?: (wallet: Wallet) => void;
  onDeleteWallet?: (walletId: string) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function WalletList({
  wallets,
  onAddWallet,
  onViewWallet,
  onDeleteWallet,
  isLoading,
  onRefresh,
  isRefreshing = false,
}: WalletListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (data: { address: string; label?: string }) => {
    setIsAdding(true);
    try {
      await onAddWallet(data);
      setIsAddModalOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Your Wallets</h2>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Wallet
        </Button>
      </div>

      {/* Wallet Grid */}
      {wallets.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onView={onViewWallet ? () => onViewWallet(wallet) : undefined}
              onDelete={
                onDeleteWallet
                  ? () => onDeleteWallet(wallet.id)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No wallets connected yet
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Wallet
          </Button>
        </div>
      )}

      {/* Add Wallet Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Wallet"
        description="Connect a Solana wallet to track transactions"
        size="md"
      >
        <WalletForm
          onSubmit={handleAdd}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isAdding}
        />
      </Modal>
    </div>
  );
}
