// SolTax AU - Main Page (Simple wallet analysis)
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowRight, Mail, Download, CheckCircle } from 'lucide-react';

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [email, setEmail] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleAnalyze = () => {
    if (!walletAddress.trim()) return;
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setIsAnalyzed(true);
      setShowEmailForm(true);
    }, 1500);
  };

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    alert(`Report will be sent to ${email}\n\nIn production, this would generate and email the tax report.`);
    setShowEmailForm(false);
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
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">How It Works</a>
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">Features</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container px-4 py-16 mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Australian Solana Tax Engine
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Paste your Solana wallet address and get an ATO-compliant tax report instantly.
            AI-powered classification for swaps, staking rewards, and more.
          </p>
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
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing || isAnalyzed || !walletAddress.trim()}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Analyzing transactions...
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
        {isAnalyzed && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">Portfolio Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$11,560</div>
                  <p className="text-xs text-gray-500">57.8 SOL across all tokens</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">YTD Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$2,450</div>
                  <p className="text-xs text-gray-500">From staking rewards</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">Capital Gains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$8,320</div>
                  <p className="text-xs text-gray-500">Net realized gains</p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
                <CardDescription>
                  Found 128 transactions (FY2024)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm">Swaps</span>
                    <span className="font-medium">45 transactions</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm">Staking Rewards (Income)</span>
                    <span className="font-medium">24 transactions</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm">Transfers</span>
                    <span className="font-medium">38 transactions</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm">Other</span>
                    <span className="font-medium">21 transactions</span>
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
                    Enter your email to receive the full tax report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendReport} className="space-y-4">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        <Mail className="h-4 w-4 mr-2" />
                        Email Report
                      </Button>
                      <Button type="button" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
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
