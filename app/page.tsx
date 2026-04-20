// SolTax AU - Main Page (Real wallet analysis)
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowRight, Mail, Download, CheckCircle, LayoutDashboard } from 'lucide-react';

interface AnalysisResult {
  balanceSol: number;
  balanceAUD: number;
  transactionCount: number;
  transactions: any[];
  txByType: Record<string, number>;
  totalFeesSol: number;
  successfulCount: number;
}

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [email, setEmail] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!walletAddress.trim()) return;
    setIsAnalyzing(true);
    setError('');
    setResult(null);

    try {
      // Fetch wallet data
      const walletRes = await fetch('/api/solana/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, includeRecentTx: true }),
      });

      const walletData = await walletRes.json();

      if (!walletData.success) {
        throw new Error(walletData.error || 'Failed to fetch wallet data');
      }

      // Fetch transactions
      const txRes = await fetch('/api/solana/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, limit: 50 }),
      });

      const txData = await txRes.json();
      const transactions = txData.transactions || [];

      // Classify transactions
      const txByType: Record<string, number> = {};
      let totalFeesSol = 0;
      let successfulCount = 0;

      transactions.forEach((tx: any) => {
        const type = tx.tx_type || tx.type || 'Unknown';
        txByType[type] = (txByType[type] || 0) + 1;
        totalFeesSol += parseFloat(tx.fee_sol || '0');
        if (!tx.is_spam) successfulCount++;
      });

      setResult({
        balanceSol: walletData.data?.balanceSol || 0,
        balanceAUD: (walletData.data?.balanceSol || 0) * 200,
        transactionCount: walletData.data?.transactionCount || transactions.length,
        transactions,
        txByType,
        totalFeesSol,
        successfulCount,
      });

      setIsAnalyzed(true);
      setShowEmailForm(true);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze wallet');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ ok?: boolean; message: string } | null>(null);

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !result?.transactions.length) return;

    setIsEmailing(true);
    setEmailStatus(null);

    const reportData = {
      walletId: walletAddress,
      walletLabel: 'Connected Wallet',
      financialYear: 2025,
      generatedAt: new Date().toISOString(),
      summary: {
        totalIncome: 0,
        totalCapitalGains: 0,
        totalCapitalLosses: 0,
        netCapitalGain: 0,
        cgtDiscountApplied: 0,
        taxableIncome: 0,
        estimatedTax: 0,
        medicareLevy: 0,
        totalTax: 0,
      },
      transactions: result.transactions,
      capitalGains: [],
      incomeTransactions: [],
    };

    try {
      const res = await fetch('/api/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, reportData }),
      });
      const data = await res.json();

      if (res.status === 402) {
        setEmailStatus({
          ok: false,
          message: 'Email reports are a Pro feature. Sign up and upgrade to send reports by email.',
        });
      } else if (res.status === 401) {
        setEmailStatus({
          ok: false,
          message: 'Sign in to email reports. You can still download the PDF above.',
        });
      } else if (!res.ok) {
        setEmailStatus({ ok: false, message: data?.error || 'Could not send email.' });
      } else {
        setEmailStatus({ ok: true, message: `Report sent to ${data.sentTo}.` });
        setShowEmailForm(false);
      }
    } catch (err: any) {
      setEmailStatus({ ok: false, message: err?.message || 'Could not send email.' });
    } finally {
      setIsEmailing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result?.transactions.length) return;

    try {
      // Generate PDF report
      const reportData = {
        walletId: walletAddress,
        walletLabel: 'Connected Wallet',
        financialYear: 2025,
        generatedAt: new Date().toISOString(),
        summary: {
          totalIncome: 0,
          totalCapitalGains: 0,
          totalCapitalLosses: 0,
          netCapitalGain: 0,
          cgtDiscountApplied: 0,
          taxableIncome: 0,
          estimatedTax: 0,
          medicareLevy: 0,
          totalTax: 0,
        },
        transactions: result.transactions,
        capitalGains: [],
        incomeTransactions: [],
      };

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          format: 'pdf',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soltax-report-${walletAddress.slice(0, 8)}-${new Date().getFullYear()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Failed to download PDF: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-aus-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold">SolTax AU</span>
          </div>
          <nav className="flex items-center gap-4 md:gap-6">
            <a href="#how-it-works" className="hidden md:inline text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">How It Works</a>
            <a href="#features" className="hidden md:inline text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">Features</a>
            <Link href="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup" className="hidden sm:block">
              <Button size="sm">
                Get Started
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container px-4 py-16 mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Australian Solana Tax Engine
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6">
            Paste your Solana wallet address and get an ATO-compliant tax report instantly.
            AI-powered classification for swaps, staking rewards, and more.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg">
                Create free account
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Go to dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Wallet Input Card */}
        <Card className="max-w-xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Analyze Your Wallet
            </CardTitle>
            <CardDescription>
              Enter your Solana wallet address to generate tax report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="e.g., 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              disabled={isAnalyzing || isAnalyzed}
            />
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing || isAnalyzed || !walletAddress.trim()}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Fetching from blockchain...
                </span>
              ) : isAnalyzed ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Analysis Complete
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Analyze Wallet
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {isAnalyzed && result && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">Wallet Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${result.balanceAUD.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">{result.balanceSol.toFixed(4)} SOL</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.transactionCount}</div>
                  <p className="text-xs text-gray-500">{result.successfulCount} successful</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(result.totalFeesSol * 200).toFixed(2)} AUD</div>
                  <p className="text-xs text-gray-500">{result.totalFeesSol.toFixed(6)} SOL</p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
                <CardDescription>
                  Found {result.transactionCount} transactions from blockchain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(result.txByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-sm">{type}</span>
                      <span className="font-medium">{count} transactions</span>
                    </div>
                  ))}
                </div>
                {/* Protocol Summary */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3 text-gray-500">Protocols Detected</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(result.transactions.map((tx: any) => tx.protocol).filter(Boolean))).map((protocol: string) => (
                      <span key={protocol} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {protocol}
                      </span>
                    ))}
                    {result.transactions.every((tx: any) => !tx.protocol) && (
                      <span className="text-sm text-gray-400">No protocols detected</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Report Form */}
            {showEmailForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Get Your Report
                  </CardTitle>
                  <CardDescription>
                    Download your tax report or enter your email to receive it
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={handleDownloadPDF} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF Report
                    </Button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or email to</span>
                    </div>
                  </div>
                  <form onSubmit={handleSendReport} className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isEmailing}
                      />
                      <Button type="submit" variant="outline" disabled={isEmailing}>
                        <Mail className="h-4 w-4 mr-2" />
                        {isEmailing ? 'Sending…' : 'Send'}
                      </Button>
                    </div>
                    {emailStatus && (
                      <p
                        className={`text-xs ${emailStatus.ok ? 'text-green-600' : 'text-amber-600'}`}
                      >
                        {emailStatus.message}
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* How It Works */}
        <section id="how-it-works" className="max-w-4xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-full bg-aus-green-100 dark:bg-aus-green-900 flex items-center justify-center text-aus-green-700 dark:text-aus-green-300 font-bold">
                  1
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">Paste Wallet Address</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your Solana wallet address. We'll fetch all your transaction history from the blockchain.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-full bg-aus-green-100 dark:bg-aus-green-900 flex items-center justify-center text-aus-green-700 dark:text-aus-green-300 font-bold">
                  2
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">AI Classification</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our AI classifies each transaction according to ATO rules - swaps, income, transfers, and more.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-full bg-aus-green-100 dark:bg-aus-green-900 flex items-center justify-center text-aus-green-700 dark:text-aus-green-300 font-bold">
                  3
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">Get Tax Report</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive a comprehensive ATO-compliant tax report via email with all your capital gains and income.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-4xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-aus-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">ATO Compliant</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Built specifically for Australian tax law with CGT events and 50% discount automatically applied.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-aus-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">AI-Powered Classification</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Google Gemini AI handles ambiguous transactions with high confidence scoring.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-aus-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">FIFO Cost Basis</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatic FIFO (First-In-First-Out) calculation for accurate capital gains tracking.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-aus-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Real-Time Prices</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      CoinGecko integration for accurate AUD valuations at transaction time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container px-4 py-8 mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          <p>SolTax AU - Australian Solana Tax Engine</p>
          <p className="mt-2">
            This tool provides general guidance only. Consult a registered tax agent for personal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
