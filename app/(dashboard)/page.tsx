// SolTax AU - Dashboard Home Page (Demo Mode - Auth Disabled)
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaxSummaryCard } from '@/components/dashboard/TaxSummaryCard';
import { TransactionTable } from '@/components/dashboard/TransactionTable';
import { WalletList } from '@/components/wallets/WalletList';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { YearSelector } from '@/components/reports/YearSelector';
import {
  Plus,
  Wallet,
  FileText,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
} from 'lucide-react';

// Demo data
const demoWallets = [
  {
    id: 'demo-1',
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    label: 'Main Wallet',
    balanceSol: 45.5,
    transactionCount: 128,
  },
  {
    id: 'demo-2',
    address: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    label: 'Trading Wallet',
    balanceSol: 12.3,
    transactionCount: 56,
  },
];

const demoTransactions = [
  {
    id: '1',
    signature: '5j7s8KqN9p2L3m4R6t7V8w9X1y2Z3a4B5c6D7e8F9g0H',
    block_time: new Date(Date.now() - 3600000).toISOString(),
    tx_type: 'swap',
    token_in_mint: 'So11111111111111111111111111111111111111112',
    token_in_amount: '1000000000',
    token_out_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    token_out_amount: '200000000',
    ato_classification: { type: 'swap', confidence: 0.95, explanation: 'Crypto-to-crypto swap' },
  },
  {
    id: '2',
    signature: '6k8t9LrO0q3M4n5S7u8W9x0Y2z3A4b5C6d7E8f9G0h1I',
    block_time: new Date(Date.now() - 7200000).toISOString(),
    tx_type: 'claim_rewards',
    token_in_mint: 'So11111111111111111111111111111111111111112',
    token_in_amount: '5000000',
    ato_classification: { type: 'income', confidence: 0.9, explanation: 'Staking rewards' },
  },
  {
    id: '3',
    signature: '7l9u0MsP1r4N5o6T8v9X0y1Z2a3B4c5D6e7F8g9H0i1J',
    block_time: new Date(Date.now() - 86400000).toISOString(),
    tx_type: 'transfer',
    token_in_mint: 'So11111111111111111111111111111111111111112',
    token_in_amount: '5000000000',
    ato_classification: { type: 'acquisition', confidence: 0.85, explanation: 'Transfer between wallets' },
  },
  {
    id: '4',
    signature: '8m0v1NtQ2s5O6p7U9w0Y1z2A3b4C5d6E7f8G9h0I1j2K',
    block_time: new Date(Date.now() - 172800000).toISOString(),
    tx_type: 'swap',
    token_in_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    token_in_amount: '100000000',
    token_out_mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    token_out_amount: '1000000000000',
    ato_classification: { type: 'swap', confidence: 0.92, explanation: 'DEX swap via Jupiter' },
  },
  {
    id: '5',
    signature: '9n1w2OuR3t6P7q8V0x1Z2a3B4c5D6e7F8g9H0i1J2k3L',
    block_time: new Date(Date.now() - 259200000).toISOString(),
    tx_type: 'stake',
    token_in_mint: 'So11111111111111111111111111111111111111112',
    token_in_amount: '10000000000',
    ato_classification: { type: 'acquisition', confidence: 0.88, explanation: 'Staked via Marinade' },
  },
];

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState(2024);
  const [wallets, setWallets] = useState(demoWallets);
  const [transactions, setTransactions] = useState(demoTransactions);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');

  const handleAddWallet = () => {
    if (newWalletAddress) {
      setWallets([
        ...wallets,
        {
          id: `wallet-${Date.now()}`,
          address: newWalletAddress,
          label: 'New Wallet',
          balanceSol: 0,
          transactionCount: 0,
        },
      ]);
      setNewWalletAddress('');
      setIsAddingWallet(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Demo Banner */}
      <div className="bg-aus-green-600 text-white p-4 rounded-lg">
        <p className="text-center font-medium">
          Demo Mode - Authentication Disabled
        </p>
        <p className="text-center text-sm text-green-100 mt-1">
          Explore the application with demo data. Connect your wallet to see real transactions.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            SolTax AU - Australian Solana Tax Engine
          </p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelector selectedYear={selectedYear} onChange={setSelectedYear} />
          <Button onClick={() => setIsAddingWallet(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TaxSummaryCard
          title="Total Portfolio Value"
          value={11560}
          description="Across all wallets (57.8 SOL)"
          trend="up"
          trendValue={12.5}
          icon="currency"
        />
        <TaxSummaryCard
          title="YTD Income"
          value={2450}
          description="From staking rewards"
          icon="currency"
        />
        <TaxSummaryCard
          title="Realized Gains"
          value={8320}
          description="Net capital gains"
          trend="up"
          trendValue={5.2}
          icon="trending-up"
        />
        <TaxSummaryCard
          title="Estimated Tax"
          value={3842}
          description="FY2024 liability"
          icon="percent"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Wallets Section */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Connected Wallets
              </CardTitle>
              <CardDescription>{wallets.length} wallet(s) connected</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{wallet.label}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{wallet.balanceSol} SOL</p>
                      <p className="text-xs text-gray-500">{wallet.transactionCount} txs</p>
                    </div>
                  </div>
                </div>
              ))}

              {isAddingWallet && (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter Solana address"
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddWallet}>Add</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAddingWallet(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>
                Latest transactions with ATO classification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionTable transactions={transactions} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Generator */}
      <ReportGenerator
        walletId="demo-1"
        financialYear={selectedYear}
        onGenerate={async (options) => {
          alert(`Generating ${options.format.toUpperCase()} report for FY${options.financialYear}...\n\nIn production, this would generate an ATO-compliant tax report.`);
        }}
      />

      {/* Features Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Classification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transactions are automatically classified using deterministic ATO rules, with Google Gemini AI handling ambiguous cases.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ATO Compliant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Built specifically for Australian tax law. CGT events, income classification, and 50% discount automatically applied.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">FIFO Cost Basis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic FIFO (First-In-First-Out) cost basis calculation for accurate capital gains tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
