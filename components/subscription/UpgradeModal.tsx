// TaxMate - Upgrade to Pro modal
//
// Solana Pay flow:
//   1. Generate a throwaway `reference` pubkey client-side.
//   2. Build a solana: URL with the treasury address + amount + reference.
//   3. Show as QR (Phantom/Solflare can scan it) and as a click-to-pay link
//      (also works on mobile — wallet app opens).
//   4. Poll /api/subscription/auto-verify with the reference; the server
//      scans the reference's sig history and finalises the subscription.
//
// "Paste signature manually" is kept as an escape hatch.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Keypair } from '@solana/web3.js';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, CheckCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

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
  const [reference, setReference] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [manualSignature, setManualSignature] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollTimer = useRef<number | null>(null);

  // Generate a fresh reference pubkey the first time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    if (!reference) {
      setReference(Keypair.generate().publicKey.toBase58());
    }
  }, [isOpen, reference]);

  // Tidy up polling when the modal closes.
  useEffect(() => {
    if (!isOpen && pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
      setStatus('idle');
      setMessage('');
    }
  }, [isOpen]);

  const solanaPayUrl = useMemo(() => {
    if (!treasuryWallet || !reference) return '';
    const params = new URLSearchParams({
      amount: String(priceSol),
      reference,
      label: 'TaxMate Pro',
      message: 'TaxMate — one-time lifetime Pro upgrade',
    });
    return `solana:${treasuryWallet}?${params.toString()}`;
  }, [treasuryWallet, reference, priceSol]);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const succeed = () => {
    stopPolling();
    setStatus('success');
    setMessage('Pro activated — you can now add more wallets.');
    setTimeout(() => {
      onUpgraded?.();
      onClose();
      setStatus('idle');
      setReference('');
    }, 1200);
  };

  const startPolling = () => {
    setStatus('waiting');
    setMessage('Watching the chain for your payment…');
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // 40 * 3s = 2 min

    pollTimer.current = window.setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch('/api/subscription/auto-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const data = await res.json();
        if (data.found && data.ok) {
          succeed();
          return;
        }
        if (data.found && !data.ok) {
          stopPolling();
          setStatus('error');
          setMessage(data.error || 'Payment found but could not be verified.');
          return;
        }
      } catch {
        // network blip; keep polling
      }
      if (attempts >= MAX_ATTEMPTS) {
        stopPolling();
        setStatus('error');
        setMessage(
          "Didn't see a payment yet. Once the tx is confirmed, click \"I've paid\" again or paste the signature."
        );
      }
    }, 3000);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(treasuryWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleManualVerify = async () => {
    if (!manualSignature.trim()) return;
    setStatus('waiting');
    setMessage('Verifying on-chain…');
    try {
      const res = await fetch('/api/subscription/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: manualSignature.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data?.error || 'Verification failed.');
        return;
      }
      succeed();
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Verification failed.');
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
            <div className="grid gap-4 sm:grid-cols-[160px_1fr] items-center">
              <div className="rounded-lg bg-white p-3 border dark:border-gray-700 flex items-center justify-center">
                {solanaPayUrl ? (
                  <QRCodeSVG value={solanaPayUrl} size={136} level="M" />
                ) : (
                  <div className="h-[136px] w-[136px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />
                )}
              </div>
              <div className="space-y-3">
                <p className="text-sm">
                  <span className="font-medium">Scan with Phantom</span> or click below to
                  pay <span className="font-medium">{priceSol} SOL</span> to TaxMate.
                </p>
                {solanaPayUrl && (
                  <a
                    href={solanaPayUrl}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-aus-green-700 hover:underline"
                  >
                    Open in wallet
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <code className="flex-1 truncate bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                    {treasuryWallet}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Copy address"
                  >
                    {copied ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {status === 'idle' && (
              <Button onClick={startPolling} className="w-full">
                I've paid — watch for it
              </Button>
            )}

            {status === 'waiting' && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                {message}
              </div>
            )}

            {status === 'error' && (
              <div className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {status === 'success' && (
              <div className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {message}
              </div>
            )}

            <div className="border-t pt-4">
              <button
                onClick={() => setShowManual((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showManual ? 'Hide manual entry' : 'Paste signature manually instead'}
              </button>

              {showManual && (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="5a7KpN8f3…"
                    value={manualSignature}
                    onChange={(e) => setManualSignature(e.target.value)}
                    disabled={status === 'waiting'}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualVerify}
                    disabled={status === 'waiting' || !manualSignature.trim()}
                  >
                    Verify signature
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
