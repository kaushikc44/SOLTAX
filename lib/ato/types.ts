// SolTax AU - ATO Types
// Type definitions specific to ATO tax calculations

import type {
  ATOTransactionType,
  ATOClassification,
  CapitalGain,
  TaxCalculationResult,
} from '@/types';

export type {
  ATOTransactionType,
  ATOClassification,
  CapitalGain,
  TaxCalculationResult,
};

// Export constants and rules for convenience
export * from './constants';
export {
  classifyTransaction,
  calculateCGT,
  calculateTaxLiability,
  isInFinancialYear,
  getFinancialYear,
  getFinancialYearRange,
  formatAUD,
  formatPercent,
  formatHoldingPeriod,
} from './rules';
export {
  calculateIncomeTax,
  calculateMedicareLevy,
  calculateCapitalGainsFIFO,
  calculateTotalTax,
  createCostBasisLot,
} from './calculator';
