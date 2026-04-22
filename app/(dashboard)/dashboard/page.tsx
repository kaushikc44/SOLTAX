// TaxMate - Dashboard (server component)
// Loads saved wallets + cached transactions, runs the real ATO classifier,
// and shows aggregated tax numbers for the current financial year.

import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/server';
import { getWallets, getTransactions } from '@/lib/db/queries';
import {
  classifyTransaction,
  calculateTaxLiability,
  getFinancialYear,
  getFinancialYearRange,
  formatAUD,
  isInFinancialYear,
} from '@/lib/ato/rules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshWalletsButton } from '@/components/dashboard/RefreshWalletsButton';
import { Wallet, AlertTriangle, TrendingUp, TrendingDown, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null; // middleware handles redirect, this is belt + braces

  // 1. Load wallets + aggregated transactions from the DB.
  const walletsResult = await getWallets(user.id);
  const wallets: any[] = walletsResult.data || [];

  let allTx: any[] = [];
  for (const w of wallets) {
    const res = await getTransactions(w.id, { limit: 500 });
    allTx = allTx.concat(res.data || []);
  }

  // 2. Filter to current Australian financial year.
  const fy = getFinancialYear(new Date());
  const fyRange = getFinancialYearRange(fy);
  const fyTx = allTx.filter((t) => isInFinancialYear(new Date(t.block_time)));

  // 3. Classify everything and aggregate.
  let ordinaryIncome = 0;
  let capitalGains = 0;
  let capitalLosses = 0;
  let discountEligibleGains = 0;
  let needsReviewCount = 0;
  const protocolCounts: Record<string, number> = {};

  for (const tx of fyTx) {
    const result = classifyTransaction({
      tx_type: tx.tx_type,
      token_in_mint: tx.token_in_mint,
      token_in_amount: tx.token_in_amount,
      token_out_mint: tx.token_out_mint,
      token_out_amount: tx.token_out_amount,
      block_time: tx.block_time,
      is_spam: tx.is_spam,
      market_value_aud: Number(tx.market_value_aud || 0),
      acquisition_cost_aud: Number(tx.acquisition_cost_aud || 0),
      holding_period_days: null,
    });

    if (tx.protocol) protocolCounts[tx.protocol] = (protocolCounts[tx.protocol] || 0) + 1;

    if (result.type === 'ORDINARY_INCOME') {
      ordinaryIncome += result.taxableAmountAUD;
    } else if (result.type === 'CGT_EVENT') {
      if (result.taxableAmountAUD > 0) {
        capitalGains += result.taxableAmountAUD;
        if (result.isCGTDiscountEligible) discountEligibleGains += result.taxableAmountAUD;
      } else {
        capitalLosses += Math.abs(result.taxableAmountAUD);
      }
    } else if (result.type === 'NEEDS_REVIEW') {
      needsReviewCount += 1;
    }
  }

  // 4. Apply CGT rules: losses reduce gains first; 50% discount applies to
  //    the eligible portion of what remains.
  const grossNetGain = Math.max(0, capitalGains - capitalLosses);
  const remainingLosses = Math.max(0, capitalLosses - capitalGains);
  const discountableRemaining = Math.max(0, discountEligibleGains - (capitalGains - grossNetGain));
  const discount = discountableRemaining * 0.5;
  const netCapitalGain = Math.max(0, grossNetGain - discount);

  const taxRes = calculateTaxLiability(ordinaryIncome, netCapitalGain);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            FY {fy}–{String(fy + 1).slice(-2)} ·{' '}
            {fyRange.start.toLocaleDateString('en-AU')} → {fyRange.end.toLocaleDateString('en-AU')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshWalletsButton wallets={wallets.map((w) => ({ id: w.id, address: w.address }))} />
          {wallets.length > 0 && (
            <Link href="/reports">
              <Button size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate report
              </Button>
            </Link>
          )}
        </div>
      </div>

      {wallets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Wallet className="h-10 w-10 mx-auto text-gray-400" />
            <div>
              <p className="font-medium">No wallets connected yet</p>
              <p className="text-sm text-gray-500">
                Add a Solana wallet to start tracking your tax position.
              </p>
            </div>
            <Link href="/wallets">
              <Button>Add your first wallet</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tax summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              label="Assessable income"
              value={formatAUD(ordinaryIncome)}
              hint="Staking, airdrops, other income"
              icon={<TrendingUp className="h-4 w-4 text-aus-green-600" />}
            />
            <SummaryCard
              label="Net capital gain"
              value={formatAUD(netCapitalGain)}
              hint={`After losses & ${formatAUD(discount)} CGT discount`}
              icon={<TrendingUp className="h-4 w-4 text-aus-green-600" />}
            />
            <SummaryCard
              label="Capital losses"
              value={formatAUD(capitalLosses)}
              hint={remainingLosses > 0 ? `${formatAUD(remainingLosses)} carries forward` : 'Offset against gains'}
              icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            />
            <SummaryCard
              label="Estimated tax"
              value={formatAUD(taxRes.totalTaxAUD)}
              hint={`Marginal rate ${taxRes.marginalRate.toFixed(1)}% (incl. Medicare)`}
              highlight
            />
          </div>

          {/* Wallet list */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Wallets ({wallets.length})</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {wallets.map((w) => {
                const walletTxCount = fyTx.filter((t) => t.wallet_id === w.id).length;
                return (
                  <Card key={w.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-aus-green-600" />
                        <CardTitle className="text-base">{w.label || 'Wallet'}</CardTitle>
                      </div>
                      <CardDescription className="font-mono text-xs">
                        {w.address.slice(0, 8)}…{w.address.slice(-6)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                      {walletTxCount} tx this FY
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Needs review / protocols */}
          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Needs review
                </CardTitle>
                <CardDescription>Transactions the classifier isn't sure about</CardDescription>
              </CardHeader>
              <CardContent>
                {needsReviewCount === 0 ? (
                  <p className="text-sm text-gray-500">Nothing to review — all transactions classified.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-2xl font-semibold">{needsReviewCount}</p>
                    <Link href="/transactions" className="text-sm text-aus-green-700 hover:underline">
                      Open transactions →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Protocols detected</CardTitle>
                <CardDescription>Where your activity happens</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(protocolCounts).length === 0 ? (
                  <p className="text-sm text-gray-500">No protocols detected yet. Try refreshing.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(protocolCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([p, n]) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-aus-green-50 dark:bg-aus-green-900/20 text-aus-green-800 dark:text-aus-green-300"
                        >
                          {p}
                          <span className="text-gray-500">·{n}</span>
                        </span>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {fyTx.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center space-y-2">
                <p className="text-sm text-gray-500">
                  No transactions cached yet for this FY. Click <strong>Refresh from chain</strong>{' '}
                  above to pull them from Helius.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 dark:text-gray-400">
          TaxMate is not a registered tax agent. These numbers are informational only — always
          review with a registered tax agent before lodging your return.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-aus-green-300 dark:border-aus-green-700' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
