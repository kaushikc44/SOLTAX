// SolTax AU - Tax Loss Harvesting Opportunities Component
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

interface HarvestingOpportunity {
  id: string;
  tokenName: string;
  tokenMint: string;
  currentHoldings: number;
  avgCostBasis: number;
  currentPrice: number;
  unrealisedLoss: number;
  potentialTaxSaving: number;
}

interface HarvestingOpportunitiesProps {
  opportunities: HarvestingOpportunity[];
  totalCapitalGains: number;
  financialYearEnd?: string;
}

export function HarvestingOpportunities({
  opportunities,
  totalCapitalGains,
  financialYearEnd = '30 June 2026',
}: HarvestingOpportunitiesProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const formatAUD = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatToken = (amount: number, decimals: number = 4) => {
    return amount.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  // Calculate total potential tax saving
  const totalPotentialSaving = opportunities.reduce(
    (sum, opp) => sum + opp.potentialTaxSaving,
    0
  );

  // Calculate how much of the gains could be offset
  const totalUnrealisedLoss = opportunities.reduce(
    (sum, opp) => sum + opp.unrealisedLoss,
    0
  );
  const offsettableGains = Math.min(totalUnrealisedLoss, totalCapitalGains);

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Tax Loss Harvesting Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
            <p className="font-medium">No harvesting opportunities found</p>
            <p className="text-sm mt-1">
              All your holdings are currently in profit or at break-even.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <div>
              <CardTitle>Tax Loss Harvesting Opportunities</CardTitle>
              <CardDescription>
                Consider selling before {financialYearEnd} to offset gains
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Potential Tax Saving</p>
            <p className="text-xl font-bold text-green-600">{formatAUD(totalPotentialSaving)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Banner */}
        <div className="p-4 bg-[#064E3B]/10 border border-[#064E3B]/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#064E3B] mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-[#064E3B]">
                Offset up to {formatAUD(offsettableGains)} of your {formatAUD(totalCapitalGains)} capital gains
              </p>
              <p className="text-sm text-[#064E3B]/80 mt-1">
                By harvesting these losses before {financialYearEnd}, you could reduce your tax liability by {formatAUD(totalPotentialSaving)}.
              </p>
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="border rounded-lg overflow-hidden"
            >
              <div
                className="p-4 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                onClick={() => setExpandedCard(expandedCard === opp.id ? null : opp.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{opp.tokenName}</span>
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {opp.tokenMint.slice(0, 8)}...{opp.tokenMint.slice(-6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span>Holdings: {formatToken(opp.currentHoldings)}</span>
                      <span>Avg Cost: {formatAUD(opp.avgCostBasis)}</span>
                      <span>Current: {formatAUD(opp.currentPrice)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unrealised Loss</p>
                    <p className="text-lg font-bold text-red-600">
                      -{formatAUD(opp.unrealisedLoss)}
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      Tax saving: {formatAUD(opp.potentialTaxSaving)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedCard === opp.id && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Current Holdings:</span>
                      <p className="font-medium">{formatToken(opp.currentHoldings)} tokens</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Average Cost Basis:</span>
                      <p className="font-medium">{formatAUD(opp.avgCostBasis)} per token</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Current Price:</span>
                      <p className="font-medium">{formatAUD(opp.currentPrice)} per token</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Cost Basis:</span>
                      <p className="font-medium">{formatAUD(opp.currentHoldings * opp.avgCostBasis)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Current Value:</span>
                      <p className="font-medium">{formatAUD(opp.currentHoldings * opp.currentPrice)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Potential Tax Saving:</span>
                      <p className="font-medium text-green-600">{formatAUD(opp.potentialTaxSaving)}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View on DexScreener
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Warning Notice */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                ATO Wash Sale Rules
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                The ATO monitors wash sales closely. If you sell a token to harvest a loss and immediately repurchase it
                (or acquire a substantially identical asset through a related party), the loss may be denied.
                Wait at least 30 days before repurchasing, or ensure there's a genuine change in economic exposure.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
          This information is for educational purposes only. Consult a registered tax agent before making investment decisions.
        </p>
      </CardContent>
    </Card>
  );
}
