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
export * from './rules';
export * from './calculator';
