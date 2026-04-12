// SolTax AU - Tax Summary Card Component
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Percent, AlertTriangle } from 'lucide-react';

interface TaxSummaryCardProps {
  financialYear: number;
  ordinaryIncome: number;
  capitalGains: number;
  capitalLosses: number;
  cgtDiscount: number;
  netCapitalGain: number;
  estimatedTax: number;
  isLoading?: boolean;
}

export function TaxSummaryCard({
  financialYear,
  ordinaryIncome,
  capitalGains,
  capitalLosses,
  cgtDiscount,
  netCapitalGain,
  estimatedTax,
  isLoading = false,
}: TaxSummaryCardProps) {
  // Determine card color based on tax liability
  const getLiabilityColor = () => {
    if (netCapitalGain < 0 || estimatedTax === 0) {
      return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
    }
    if (estimatedTax < 5000) {
      return 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800';
    }
    return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
  };

  const formatAUD = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">FY{financialYear}-{financialYear + 1} Tax Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full border-2 ${getLiabilityColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            FY{financialYear}-{financialYear + 1} Tax Summary
          </CardTitle>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            1 July {financialYear} - 30 June {financialYear + 1}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Ordinary Income */}
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Ordinary Income</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatAUD(ordinaryIncome)}
          </span>
        </div>

        {/* Capital Gains */}
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Capital Gains</span>
          </div>
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatAUD(capitalGains)}
          </span>
        </div>

        {/* Capital Losses */}
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Capital Losses</span>
          </div>
          <span className="font-medium text-red-600 dark:text-red-400">
            -{formatAUD(capitalLosses)}
          </span>
        </div>

        {/* CGT Discount */}
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">CGT Discount (50%)</span>
          </div>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            -{formatAUD(cgtDiscount)}
          </span>
        </div>

        {/* Net Capital Gain */}
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Capital Gain</span>
          </div>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            {formatAUD(netCapitalGain)}
          </span>
        </div>

        {/* Estimated Tax Liability */}
        <div className="pt-3 mt-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${
                estimatedTax > 5000 ? 'text-red-600' : 'text-amber-600'
              }`} />
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Estimated Tax Liability
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Estimate only — consult accountant
                </p>
              </div>
            </div>
            <span className={`text-xl font-bold ${
              estimatedTax > 5000 ? 'text-red-600' : 'text-amber-600'
            }`}>
              {formatAUD(estimatedTax)}
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          This is an estimate based on the transactions recorded. Actual tax liability may differ.
          Always consult a registered tax agent before lodging your tax return.
        </p>
      </CardContent>
    </Card>
  );
}
