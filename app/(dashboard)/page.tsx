// SolTax AU - Main Dashboard Page
'use client';

import { useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { TaxSummaryCard } from '@/components/TaxSummaryCard';
import { TransactionTable } from '@/components/TransactionTable';
import { HarvestingOpportunities } from '@/components/HarvestingOpportunities';
import { ReviewModal } from '@/components/ReviewModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, FileText, TrendingUp, AlertTriangle, Download, Mail } from 'lucide-react';

// Demo data - replace with actual API calls
const DEMO_WALLETS = [
  { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', label: 'Main Wallet' },
];

const DEMO_TRANSACTIONS = [
  {
    id: '1',
    signature: '5j7s8KqN9p2L3m4R6t7V8w9X1y2Z3a4B5c6D7e8F9g0H',
    block_time: new Date(Date.now() - 3600000).toISOString(),
    type: 'swap',
    description: 'Swapped 1.0 SOL for 200 USDC via Jupiter',
    audIn: 300,
    audOut: 200,
    classification: 'SWAP',
    aiConfidence: 0.95,
    aiExplanation: 'Token swap executed through Jupiter aggregator. This is a CGT event - disposal of SOL.',
    ato_rule: 'ATO crypto assets guidance — disposal of CGT asset',
  },
  {
    id: '2',
    signature: '6k8t9LrO0q3M4n5S7u8W9x0Y2z3A4b5C6d7E8f9G0h1I',
    block_time: new Date(Date.now() - 7200000).toISOString(),
    type: 'reward',
    description: 'Staking reward from Marinade',
    audIn: 7.5,
    audOut: 0,
    classification: 'STAKING_REWARD',
    aiConfidence: 0.92,
    aiExplanation: 'Staking reward received from Marinade liquid staking protocol.',
    ato_rule: 'ATO — staking rewards treated as ordinary income',
  },
  {
    id: '3',
    signature: '7l9u0MsP1r4N5o6T8v9X0y1Z2a3B4c5D6e7F8g9H0i1J',
    block_time: new Date(Date.now() - 86400000).toISOString(),
    type: 'transfer',
    description: 'Transfer to own wallet',
    audIn: 0,
    audOut: 0,
    classification: 'TRANSFER',
    aiConfidence: 0.88,
    aiExplanation: 'Transfer between wallets under same ownership. Not a taxable event.',
    ato_rule: 'ATO — transfer between own wallets not a disposal',
  },
  {
    id: '4',
    signature: '8m0v1NtQ2s5O6p7U9w0Y1z2A3b4C5d6E7f8G9h0I1j2K',
    block_time: new Date(Date.now() - 172800000).toISOString(),
    type: 'swap',
    description: 'Swapped 100 USDC for BONK via Raydium',
    audIn: 150,
    audOut: 100,
    classification: 'SWAP',
    aiConfidence: 0.65,
    needsReview: true,
    aiExplanation: 'DEX swap detected but transaction structure is complex. May involve intermediate tokens.',
    ato_rule: 'ATO crypto assets guidance — disposal of CGT asset',
  },
  {
    id: '5',
    signature: '9n1w2OuR3t6P7q8V0x1Z2a3B4c5D6e7F8g9H0i1J2k3L',
    block_time: new Date(Date.now() - 259200000).toISOString(),
    type: 'airdrop',
    description: 'JUP token airdrop',
    audIn: 450,
    audOut: 0,
    classification: 'AIRDROP_STANDARD',
    aiConfidence: 0.78,
    aiExplanation: 'Jupiter (JUP) token airdrop received. Standard airdrop is ordinary income.',
    ato_rule: 'ATO — airdrop treated as ordinary income',
  },
  {
    id: '6',
    signature: '0o2x3PvS4u7Q8r9W1y2A3b4C5d6E7f8G9h0I1j2K3l4M',
    block_time: new Date(Date.now() - 345600000).toISOString(),
    type: 'spam',
    description: 'Unknown token received',
    audIn: 0,
    audOut: 0,
    classification: 'SPAM',
    isSpam: true,
    aiConfidence: 0.99,
    aiExplanation: 'Unsolicited token with no market value. Likely spam/scam token.',
    ato_rule: 'ATO — zero value assets need not be declared',
  },
];

const HARVESTING_OPPORTUNITIES = [
  {
    id: '1',
    tokenName: 'BONK',
    tokenMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    currentHoldings: 50000000,
    avgCostBasis: 0.000004,
    currentPrice: 0.0000025,
    unrealisedLoss: 75,
    potentialTaxSaving: 24,
  },
  {
    id: '2',
    tokenName: 'RAY',
    tokenMint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    currentHoldings: 100,
    avgCostBasis: 2.5,
    currentPrice: 1.8,
    unrealisedLoss: 70,
    potentialTaxSaving: 22,
  },
];

export default function DashboardPage() {
  const [wallets, setWallets] = useState(DEMO_WALLETS);
  const [transactions, setTransactions] = useState(DEMO_TRANSACTIONS);
  const [isScanning, setIsScanning] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Calculate tax summary
  const ordinaryIncome = transactions
    .filter((tx) => tx.classification.includes('INCOME') || tx.classification.includes('REWARD') || tx.classification.includes('AIRDROP'))
    .reduce((sum, tx) => sum + (tx.audIn || 0), 0);

  const capitalGains = transactions
    .filter((tx) => tx.classification.includes('SWAP') || tx.classification.includes('NFT') || tx.classification.includes('LP'))
    .filter((tx) => tx.audIn && tx.audIn > (tx.audOut || 0))
    .reduce((sum, tx) => sum + ((tx.audIn || 0) - (tx.audOut || 0)), 0);

  const capitalLosses = transactions
    .filter((tx) => tx.classification.includes('SWAP') || tx.classification.includes('NFT') || tx.classification.includes('LP'))
    .filter((tx) => tx.audOut && tx.audOut > (tx.audIn || 0))
    .reduce((sum, tx) => sum + ((tx.audOut || 0) - (tx.audIn || 0)), 0);

  const cgtDiscount = capitalGains > 0 ? capitalGains * 0.5 : 0;
  const netCapitalGain = Math.max(0, capitalGains - capitalLosses - cgtDiscount);

  // Simplified tax calculation (30% marginal rate for demo)
  const estimatedTax = (ordinaryIncome * 0.32) + (netCapitalGain * 0.32);

  const handleWalletConnected = (walletAddress: string) => {
    setWallets([...wallets, { address: walletAddress, label: 'New Wallet' }]);
    // In production: fetch real transactions here
  };

  const handleReviewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setReviewModalOpen(true);
  };

  const handleSaveReview = async (transactionId: string, newClassification: string) => {
    // In production: save to Supabase
    setTransactions((prev) => prev.map((tx) =>
      tx.id === transactionId
        ? { ...tx, classification: newClassification, needsReview: false, aiConfidence: 1.0 } as any
        : tx
    ));
    setReviewModalOpen(false);
  };

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    alert(`Generating ${format.toUpperCase()} report...\n\nIn production, this would download your tax report.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#064E3B] flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">SolTax AU</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Australian Solana Tax Engine</p>
              </div>
            </div>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Wallet Connect Section */}
          {!wallets.length && (
            <section>
              <WalletConnect
                onWalletConnected={handleWalletConnected}
                existingWallets={[]}
              />
            </section>
          )}

          {/* Connected Wallets Summary */}
          {wallets.length > 0 && (
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {wallets.map((wallet, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-[#064E3B]" />
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

          {/* Tax Summary */}
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

          {/* Harvesting Opportunities */}
          {HARVESTING_OPPORTUNITIES.length > 0 && (
            <section>
              <HarvestingOpportunities
                opportunities={HARVESTING_OPPORTUNITIES}
                totalCapitalGains={capitalGains}
              />
            </section>
          )}

          {/* Transactions Table */}
          {transactions.length > 0 && (
            <section>
              <TransactionTable
                transactions={transactions}
                onReview={handleReviewTransaction}
              />
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  Tax Agent Disclaimer
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  SolTax AU is not a registered tax agent. Reports and calculations are for informational purposes only.
                  The information provided does not constitute tax advice. Always consult a registered tax agent before
                  lodging your tax return with the ATO.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>SolTax AU — Built for Australian crypto investors</span>
              <span>•</span>
              <span>Financial Year 2025-26</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Data sourced from Solana blockchain. AUD prices from CoinGecko.
              AI classification powered by Anthropic Claude.
            </p>
          </div>
        </div>
      </footer>

      {/* Review Modal */}
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
