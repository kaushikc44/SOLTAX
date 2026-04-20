// SolTax AU - Upgrade to Pro modal
//
// Shows the treasury wallet + amount, lets the user paste the resulting tx
// signature, and calls /api/subscription/verify. The server does the on-chain
// verification; this component is just the UI shell.

'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
  priceSol: number;
  treasuryWallet: string;
  proLimit: number;
}

export function UpgradeModal({
  isOpen,
  onClose,
  onUpgraded,
  priceSol,
  treasuryWallet,
  proLimit,
}: UpgradeModalProps) {
  const [signature, setSignature] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(treasuryWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleVerify = async () => {
    if (!signature.trim()) {
      setError('Paste the transaction signature from your wallet.');
      return;
    }
    setIsVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/subscription/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: signature.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Verification failed.');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onUpgraded?.();
        onClose();
        setSuccess(false);
        setSignature('');
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isConfigured = !!treasuryWallet;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upgrade to Pro" size="md">
      <div className="space-y-5">
        <div className="rounded-lg border border-aus-green-200 bg-aus-green-50 dark:bg-aus-green-900/20 p-4">
          <p className="text-sm font-medium text-aus-green-800 dark:text-aus-green-200">
            {priceSol} SOL · one-time, lifetime access
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
            <li>• Track up to {proLimit} wallets</li>
            <li>• Email tax reports to yourself or your accountant</li>
            <li>• Priority price + transaction refresh</li>
          </ul>
        </div>

        {!isConfigured ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>
              Treasury wallet not configured. Set <code>SOLANA_TREASURY_WALLET</code> in your
              environment.
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium mb-2">1. Send exactly {priceSol} SOL to:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg font-mono break-all">
                  {treasuryWallet}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use Phantom, Solflare, or any Solana wallet. Paying less will be rejected.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">2. Paste the transaction signature:</p>
              <Input
                placeholder="5a7KpN8f3…"
                value={signature}
                onChange={(e) => {
                  setSignature(e.target.value);
                  setError('');
                }}
                disabled={isVerifying || success}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Pro activated — you can now add more wallets.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isVerifying}>
                Cancel
              </Button>
              <Button onClick={handleVerify} disabled={isVerifying || success || !signature.trim()}>
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying on-chain…
                  </>
                ) : (
                  'Verify payment'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
