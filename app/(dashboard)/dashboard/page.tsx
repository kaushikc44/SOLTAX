// SolTax AU - Dashboard Page
// Renders inside app/(dashboard)/layout.tsx (Header + Sidebar).
'use client';

import { useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { TaxSummaryCard } from '@/components/TaxSummaryCard';
import { TransactionTable } from '@/components/TransactionTable';
import { ReviewModal } from '@/components/ReviewModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, FileText, Download, AlertTriangle } from 'lucide-react';

interface ConnectedWallet {
  address: string;
  label: string;
}

export default function DashboardPage() {
  const [wallets, setWallets] = useState<ConnectedWallet[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const ordinaryIncome = transactions
    .filter((tx) => {
      const type = String(tx.classification || tx.tx_type || '').toUpperCase();
      return type.includes('REWARD') || type.includes('AIRDROP') || type.includes('INCOME');
    })
    .reduce((sum, tx) => sum + (tx.audIn || tx.market_value_aud || 0), 0);

  const capitalGains = transactions
    .filter((tx) => {
      const type = String(tx.classification || tx.tx_type || '').toUpperCase();
      return type.includes('SWAP') || type.includes('NFT') || type.includes('LP');
    })
    .reduce((sum, tx) => {
      const inVal = tx.audIn ?? tx.market_value_aud ?? 0;
      const outVal = tx.audOut ?? tx.acquisition_cost_aud ?? 0;
      return sum + Math.max(0, inVal - outVal);
    }, 0);

  const capitalLosses = transactions
    .filter((tx) => {
      const type = String(tx.classification || tx.tx_type || '').toUpperCase();
      return type.includes('SWAP') || type.includes('NFT') || type.includes('LP');
    })
    .reduce((sum, tx) => {
      const inVal = tx.audIn ?? tx.market_value_aud ?? 0;
      const outVal = tx.audOut ?? tx.acquisition_cost_aud ?? 0;
      return sum + Math.max(0, outVal - inVal);
    }, 0);

  const cgtDiscount = capitalGains > 0 ? capitalGains * 0.5 : 0;
  const netCapitalGain = Math.max(0, capitalGains - capitalLosses - cgtDiscount);
  const estimatedTax = (ordinaryIncome + netCapitalGain) * 0.32;

  const handleWalletConnected = async (walletAddress: string) => {
    setWallets((prev) => [...prev, { address: walletAddress, label: 'Connected Wallet' }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/solana/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      const fetched = data.transactions || [];

      setTransactions(
        fetched.map((tx: any, idx: number) => ({
          id: `tx_${idx}_${tx.signature?.slice(0, 8) || idx}`,
          signature: tx.signature,
          block_time: tx.block_time,
          type: tx.tx_type || 'unknown',
          protocol: tx.protocol,
          description: `${tx.tx_type || 'Transaction'}${tx.protocol ? ` via ${tx.protocol}` : ''}`,
          audIn: tx.market_value_aud || 0,
          audOut: tx.acquisition_cost_aud || 0,
          classification: tx.ato_classification?.type || tx.tx_type || 'UNKNOWN',
          aiConfidence: tx.ai_confidence || 0.8,
          aiExplanation: tx.ai_explanation || 'Transaction classified based on ATO rules.',
          ato_rule: tx.ato_classification?.rule || 'ATO crypto assets guidance',
          needsReview: (tx.ai_confidence || 1) < 0.7,
          isSpam: tx.is_spam || false,
          raw: tx,
        }))
      );
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setReviewModalOpen(true);
  };

  const handleSaveReview = async (transactionId: string, newClassification: string) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === transactionId
          ? { ...tx, classification: newClassification, needsReview: false, aiConfidence: 1.0 }
          : tx
      )
    );
    setReviewModalOpen(false);
  };

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    if (!transactions.length) return;

    const reportData = {
      walletId: wallets[0]?.address || 'unknown',
      walletLabel: wallets[0]?.label || 'Connected Wallet',
      financialYear: 2025,
      generatedAt: new Date().toISOString(),
      summary: {
        totalIncome: ordinaryIncome,
        totalCapitalGains: capitalGains,
        totalCapitalLosses: capitalLosses,
        netCapitalGain,
        cgtDiscountApplied: cgtDiscount,
        taxableIncome: ordinaryIncome + netCapitalGain,
        estimatedTax,
        medicareLevy: (ordinaryIncome + netCapitalGain) * 0.02,
        totalTax: estimatedTax + (ordinaryIncome + netCapitalGain) * 0.02,
      },
      transactions: transactions.map((tx) => tx.raw || tx),
      capitalGains: [],
      incomeTransactions: [],
    };

    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportData, format }),
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soltax-report-${new Date().getFullYear()}.${format}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Australian Solana Tax Engine</p>
        </div>
        {transactions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportReport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportReport('pdf')}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      {!wallets.length && !isLoading && (
        <section>
          <WalletConnect onWalletConnected={handleWalletConnected} existingWallets={[]} />
        </section>
      )}

      {isLoading && !transactions.length && (
        <section className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-aus-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Fetching transactions from Solana blockchain...
          </p>
        </section>
      )}

      {wallets.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-aus-green-600" />
                  <CardTitle className="text-base">{wallet.label || 'Wallet'}</CardTitle>
                </div>
                <CardDescription className="font-mono text-xs">
                  {wallet.address.slice(0, 12)}...{wallet.address.slice(-8)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-500">Add Another Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Wallet className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {transactions.length > 0 && (
        <section>
          <TaxSummaryCard
            financialYear={2025}
            ordinaryIncome={ordinaryIncome}
            capitalGains={capitalGains}
            capitalLosses={capitalLosses}
            cgtDiscount={cgtDiscount}
            netCapitalGain={netCapitalGain}
            estimatedTax={estimatedTax}
          />
        </section>
      )}

      {transactions.length > 0 && (
        <section>
          <TransactionTable
            transactions={transactions}
            onReview={handleReviewTransaction}
            isLoading={false}
          />
        </section>
      )}

      {transactions.length === 0 && !isLoading && wallets.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No transactions found for this wallet.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">Tax Agent Disclaimer</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            SolTax AU is not a registered tax agent. Always consult a registered tax agent before
            lodging your tax return with the ATO.
          </p>
        </div>
      </div>

      <ReviewModal
        transaction={selectedTransaction}
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedTransaction(null);
        }}
        onSave={handleSaveReview}
      />
    </div>
  );
}
