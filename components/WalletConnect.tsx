// SolTax AU - Wallet Connect Component
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Scan, CheckCircle, AlertCircle } from 'lucide-react';

interface WalletConnectProps {
  onWalletConnected: (walletAddress: string) => void;
  existingWallets?: Array<{ address: string; label?: string }>;
}

export function WalletConnect({ onWalletConnected, existingWallets = [] }: WalletConnectProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    stage: 'fetching' | 'classifying' | 'complete';
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateSolanaAddress = (address: string): boolean => {
    // Basic Solana address validation (base58, 32-44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  };

  const handleScanWallet = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a Solana wallet address');
      return;
    }

    if (!validateSolanaAddress(walletAddress.trim())) {
      setError('Invalid Solana wallet address. Please check and try again.');
      return;
    }

    setError('');
    setSuccess('');
    setIsScanning(true);

    try {
      // Stage 1: Fetch transactions
      setScanProgress({
        stage: 'fetching',
        current: 0,
        total: 0,
      });

      // Call API to fetch transactions
      const fetchResponse = await fetch('/api/solana/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddress.trim(),
        }),
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }

      const fetchData = await fetchResponse.json();
      const transactionCount = fetchData.transactions?.length || 0;

      // Stage 2: Classify with AI
      setScanProgress({
        stage: 'classifying',
        current: 0,
        total: transactionCount,
      });

      // Simulate AI classification progress
      for (let i = 0; i <= transactionCount; i += 10) {
        setScanProgress({
          stage: 'classifying',
          current: i,
          total: transactionCount,
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      setScanProgress({
        stage: 'complete',
        current: transactionCount,
        total: transactionCount,
      });

      setSuccess(`Successfully scanned ${transactionCount} transactions!`);

      // Notify parent component
      onWalletConnected(walletAddress.trim());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan wallet. Please try again.');
      setScanProgress(null);
    } finally {
      setIsScanning(false);
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isScanning) {
      handleScanWallet();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-[#064E3B] flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connect Wallet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your Solana wallet address to analyse transactions
            </p>
          </div>
        </div>

        {/* Existing Wallets */}
        {existingWallets.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Connected Wallets
            </p>
            {existingWallets.map((wallet, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#064E3B]" />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {wallet.label || 'Wallet'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Input Field */}
        <div className="space-y-3">
          <div className="relative">
            <Input
              placeholder="Enter Solana wallet address (e.g., 7xKX...gAsU)"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isScanning}
              className="pr-12 font-mono text-sm"
            />
            {walletAddress && !isScanning && (
              <button
                onClick={() => setWalletAddress('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <AlertCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            onClick={handleScanWallet}
            disabled={isScanning || !walletAddress.trim()}
            className="w-full"
            size="lg"
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <Scan className="h-4 w-4 animate-pulse" />
                Scanning...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Scan Wallet
              </span>
            )}
          </Button>
        </div>

        {/* Progress Indicator */}
        {scanProgress && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {scanProgress.stage === 'fetching' && 'Fetching transactions...'}
                {scanProgress.stage === 'classifying' && 'Classifying with AI...'}
                {scanProgress.stage === 'complete' && 'Scan complete!'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {scanProgress.current} / {scanProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-[#064E3B] h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {success}
            </p>
          </div>
        )}

        {/* Help Text */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          We'll fetch all transactions from the Solana blockchain and classify them according to ATO rules.
          This may take a few minutes for wallets with many transactions.
        </p>
      </div>
    </div>
  );
}
