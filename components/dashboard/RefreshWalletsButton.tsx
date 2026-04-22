'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RefreshWalletsButtonProps {
  wallets: { id: string; address: string }[];
}

/**
 * Client button that walks every saved wallet, tells the server to fetch
 * fresh transactions from Helius (which creates cost_basis_lots), and then
 * calls router.refresh() so the server-rendered dashboard re-reads the DB.
 */
export function RefreshWalletsButton({ wallets }: RefreshWalletsButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');

  const onClick = () => {
    if (wallets.length === 0) return;
    setStatus('');
    startTransition(async () => {
      let ok = 0;
      let fail = 0;
      for (const wallet of wallets) {
        try {
          const res = await fetch('/api/solana/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: wallet.address,
              walletId: wallet.id,
              useCache: false,
              limit: 100,
            }),
          });
          if (res.ok) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
      }
      setStatus(
        fail > 0
          ? `Refreshed ${ok}/${wallets.length} wallets (${fail} failed)`
          : `Refreshed ${ok} wallet${ok === 1 ? '' : 's'}`
      );
      router.refresh();
      setTimeout(() => setStatus(''), 4000);
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={onClick} disabled={pending || wallets.length === 0}>
        <RefreshCw className={`h-4 w-4 mr-2 ${pending ? 'animate-spin' : ''}`} />
        {pending ? 'Refreshing…' : 'Refresh from chain'}
      </Button>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  );
}
