// SolTax AU - CSV Report Generation
import type { Transaction, CostBasisLot, CapitalGain } from '@/types';

/**
 * Generate CSV export for transactions.
 * ATO-compliant format for record keeping.
 */
export function exportTransactionsCSV(transactions: Transaction[]): string {
  const headers = [
    'Date',
    'Time',
    'Transaction Type',
    'Asset',
    'Amount',
    'Value AUD',
    'Counterparty',
    'Notes',
    'Signature',
  ];

  const rows = transactions.map(tx => {
    const date = new Date(tx.block_time);
    const classification = tx.ato_classification as any;

    return [
      date.toLocaleDateString('en-AU'),
      date.toLocaleTimeString('en-AU'),
      classification?.type || tx.tx_type,
      tx.token_in_mint || tx.token_out_mint || 'SOL',
      formatAmount(tx.token_in_amount || tx.token_out_amount),
      '', // Would need price data
      '', // Counterparty
      classification?.explanation || '',
      tx.signature,
    ].map(escapeCSV).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate CSV for capital gains schedule.
 */
export function exportCapitalGainsCSV(gains: CapitalGain[]): string {
  const headers = [
    'Asset',
    'Acquisition Date',
    'Disposal Date',
    'Cost Basis AUD',
    'Proceeds AUD',
    'Capital Gain/Loss',
    'CGT Discount Applied',
    'Discounted Gain',
  ];

  const rows = gains.map(gain => [
    gain.asset,
    gain.acquiredAt.toISOString().split('T')[0],
    gain.disposedAt.toISOString().split('T')[0],
    gain.costBasis.toFixed(2),
    gain.proceeds.toFixed(2),
    gain.gain.toFixed(2),
    gain.discountEligible ? 'Yes' : 'No',
    gain.discountedGain.toFixed(2),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate CSV for cost basis lots.
 */
export function exportCostBasisCSV(lots: CostBasisLot[]): string {
  const headers = [
    'Asset',
    'Acquisition Date',
    'Amount',
    'Cost Basis AUD',
    'Cost per Unit',
    'Method',
    'Status',
  ];

  const rows = lots.map(lot => {
    const amount = parseFloat(lot.amount);
    const costBasis = parseFloat(lot.cost_basis_aud);
    const costPerUnit = costBasis / amount;

    return [
      lot.mint,
      new Date(lot.acquired_at).toISOString().split('T')[0],
      amount.toFixed(6),
      costBasis.toFixed(2),
      costPerUnit.toFixed(6),
      lot.method,
      lot.disposed_at ? 'Disposed' : 'Held',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate CSV for tax summary.
 */
export function exportTaxSummaryCSV(summary: {
  financialYear: number;
  totalIncome: number;
  totalCapitalGains: number;
  totalCapitalLosses: number;
  netCapitalGain: number;
  cgtDiscount: number;
  taxableIncome: number;
  estimatedTax: number;
  medicareLevy: number;
  totalTax: number;
}): string {
  const headers = ['Field', 'Value'];

  const rows = [
    ['Financial Year', summary.financialYear.toString()],
    ['Total Income', summary.totalIncome.toFixed(2)],
    ['Gross Capital Gains', summary.totalCapitalGains.toFixed(2)],
    ['Capital Losses', summary.totalCapitalLosses.toFixed(2)],
    ['Net Capital Gain', summary.netCapitalGain.toFixed(2)],
    ['CGT Discount', summary.cgtDiscount.toFixed(2)],
    ['Taxable Income', summary.taxableIncome.toFixed(2)],
    ['Estimated Income Tax', summary.estimatedTax.toFixed(2)],
    ['Medicare Levy', summary.medicareLevy.toFixed(2)],
    ['Total Tax Payable', summary.totalTax.toFixed(2)],
  ].map(([field, value]) => `${field},${value}`);

  return [headers.join(','), ...rows].join('\n');
}

// ============================================
// HELPERS
// ============================================

function escapeCSV(value: string): string {
  // Escape quotes and wrap in quotes if contains comma or quote
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAmount(amount: string | null): string {
  if (!amount) return '0';
  try {
    return parseFloat(amount).toFixed(6);
  } catch {
    return amount;
  }
}

/**
 * Download CSV file in browser.
 */
export function downloadCSV(content: string, filename: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
