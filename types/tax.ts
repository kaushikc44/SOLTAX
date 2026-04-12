// SolTax AU - Tax-Specific Types

import type { ATOTransactionType, FinancialYear } from './index';

// ATO Tax brackets for 2023-24 and 2024-25 (Stage 3 tax cuts)
export const TAX_BRACKETS_2024: Array<{
  min: number;
  max: number | null;
  rate: number;
  baseTax: number;
}> = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18201, max: 45000, rate: 19, baseTax: 0 },
  { min: 45001, max: 135000, rate: 30, baseTax: 5092 },
  { min: 135001, max: 190000, rate: 37, baseTax: 32092 },
  { min: 190001, max: null, rate: 45, baseTax: 52442 },
];

// Medicare levy
export const MEDICARE_LEVY_RATE = 0.02; // 2%

// CGT discount
export const CGT_DISCOUNT_RATE = 0.5; // 50% discount for assets held 12+ months

// Personal use asset threshold
export const PERSONAL_USE_ASSET_THRESHOLD = 10000; // $10,000 AUD

// Tax calculation result
export interface TaxCalculation {
  // Income
  assessableIncome: number;
  allowableDeductions: number;
  netIncome: number;

  // Capital Gains
  grossCapitalGains: number;
  grossCapitalLosses: number;
  netCapitalGainBeforeDiscount: number;
  cgtDiscount: number;
  netCapitalGain: number;

  // Taxable income
  taxableIncome: number;

  // Tax calculation
  incomeTax: number;
  medicareLevy: number;
  totalTax: number;
  effectiveTaxRate: number;
}

// CGT event details
export interface CGTEvent {
  id: string;
  asset: string;
  acquisitionDate: Date;
  disposalDate: Date;
  acquisitionCost: number;
  disposalProceeds: number;
  incidentalCosts: number;
  capitalGain: number;
  capitalLoss: number;
  discountEligible: boolean;
  discountAmount: number;
  netGain: number;
}

// Income event details
export interface IncomeEvent {
  id: string;
  type: ATOTransactionType;
  description: string;
  amount: number;
  date: Date;
  source: string;
  deductible: boolean;
  deductionAmount: number;
}

// Financial year summary
export interface FinancialYearSummary {
  year: FinancialYear;
  startDate: Date;
  endDate: Date;
  incomeEvents: IncomeEvent[];
  cgtEvents: CGTEvent[];
  calculation: TaxCalculation;
}

// ATO report data
export interface ATOReportData {
  taxpayerInfo: {
    name: string;
    tfn?: string;
    address: string;
  };
  financialYear: FinancialYear;
  totalIncome: number;
  totalDeductions: number;
  netCapitalGains: number;
  taxableIncome: number;
  taxPayable: number;
  medicareLevy: number;
  reportGenerated: Date;
}

// Cost basis method
export type CostBasisMethod = 'FIFO' | 'LIFO' | 'HIFO' | 'SPECIFIC';

// Cost basis lot
export interface CostBasisLot {
  id: string;
  mint: string;
  acquiredAt: Date;
  amount: number;
  costBasisAUD: number;
  method: CostBasisMethod;
  remaining: number;
}

// FIFO matching result
export interface FIFOMatchResult {
  lot: CostBasisLot;
  amountUsed: number;
  costBasisUsed: number;
  gain: number;
}

// Tax position
export interface TaxPosition {
  realizedGains: number;
  realizedLosses: number;
  netPosition: number;
  unrealizedGains: number;
  unrealizedLosses: number;
  totalPosition: number;
}
