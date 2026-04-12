// SolTax AU - ATO Tax Calculator
// Calculates tax liability based on classified transactions

import type {
  CostBasisLot,
  CapitalGain,
  TaxCalculationResult,
  ATOTransactionType,
} from '@/types';
import {
  TAX_BRACKETS,
  MEDICARE_LEVY_RATE,
  CGT_DISCOUNT_RATE,
  CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
  getFinancialYear,
} from './constants';

// ============================================
// INCOME TAX CALCULATION
// ============================================

/**
 * Calculate income tax for a given taxable income.
 * Uses Australian tax brackets.
 */
export function calculateIncomeTax(taxableIncome: number): number {
  let tax = 0;

  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= bracket.min - 1) {
      break;
    }

    if (bracket.max === null || taxableIncome <= bracket.max) {
      tax += bracket.baseTax + (taxableIncome - bracket.min + 1) * (bracket.rate / 100);
      break;
    } else {
      tax += bracket.baseTax + (bracket.max! - bracket.min + 1) * (bracket.rate / 100);
    }
  }

  return Math.round(tax * 100) / 100;
}

/**
 * Calculate Medicare levy.
 */
export function calculateMedicareLevy(taxableIncome: number): number {
  // Simplified - doesn't include phase-in or thresholds
  return Math.round(taxableIncome * MEDICARE_LEVY_RATE * 100) / 100;
}

// ============================================
// CAPITAL GAINS CALCULATION (FIFO)
// ============================================

export interface Disposal {
  mint: string;
  amount: number;
  proceedsAUD: number;
  disposalDate: Date;
}

/**
 * Calculate capital gains using FIFO method.
 * Matches disposals against acquisitions.
 */
export function calculateCapitalGainsFIFO(
  acquisitions: CostBasisLot[],
  disposals: Disposal[]
): {
  gains: CapitalGain[];
  totalGains: number;
  totalLosses: number;
  netGain: number;
  discountEligible: number;
} {
  const gains: CapitalGain[] = [];

  // Sort acquisitions by date (FIFO)
  const sortedAcquisitions = [...acquisitions].sort(
    (a, b) => new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime()
  );

  // Track remaining amounts in each lot
  const remainingLots = sortedAcquisitions.map(lot => ({
    ...lot,
    remaining: parseFloat(lot.amount),
  }));

  let totalGains = 0;
  let totalLosses = 0;
  let discountEligible = 0;

  for (const disposal of disposals) {
    let remainingToMatch = disposal.amount;
    let totalCostBasis = 0;

    while (remainingToMatch > 0 && remainingLots.length > 0) {
      const lot = remainingLots.find(
        l => l.mint === disposal.mint && l.remaining > 0
      );

      if (!lot) {
        // No more lots to match - may need to handle as error
        // or assume zero cost basis
        break;
      }

      const amountUsed = Math.min(remainingToMatch, lot.remaining);
      const costBasisPerUnit = parseFloat(lot.cost_basis_aud) / parseFloat(lot.amount);
      const costBasisUsed = amountUsed * costBasisPerUnit;

      totalCostBasis += costBasisUsed;
      lot.remaining -= amountUsed;
      remainingToMatch -= amountUsed;

      // Check CGT discount eligibility
      const acquiredAt = new Date(lot.acquired_at);
      const holdingPeriodDays = Math.floor(
        (disposal.disposalDate.getTime() - acquiredAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (holdingPeriodDays >= CGT_DISCOUNT_HOLDING_PERIOD_DAYS) {
        discountEligible += amountUsed;
      }
    }

    const proceeds = disposal.proceedsAUD;
    const gain = proceeds - totalCostBasis;

    gains.push({
      asset: disposal.mint,
      acquiredAt: new Date(), // Would be actual acquisition date
      disposedAt: disposal.disposalDate,
      costBasis: totalCostBasis,
      proceeds: proceeds,
      gain: gain,
      discountEligible: gain > 0 && discountEligible > 0,
      discountedGain: gain > 0 ? gain * (1 - CGT_DISCOUNT_RATE) : gain,
    });

    if (gain > 0) {
      totalGains += gain;
    } else {
      totalLosses += Math.abs(gain);
    }
  }

  // Apply losses against gains
  const netGain = totalGains - totalLosses;

  return {
    gains,
    totalGains,
    totalLosses,
    netGain,
    discountEligible,
  };
}

/**
 * Apply CGT discount to eligible gains.
 */
export function applyCGTDiscount(
  gains: CapitalGain[],
  totalLosses: number,
  cgtDiscountEligible: boolean
): {
  netCapitalGain: number;
  discountApplied: number;
} {
  if (!cgtDiscountEligible) {
    return {
      netCapitalGain: Math.max(0, gains.reduce((sum, g) => sum + g.gain, 0) - totalLosses),
      discountApplied: 0,
    };
  }

  // Separate discount-eligible and non-eligible gains
  let discountEligibleGains = 0;
  let nonDiscountEligibleGains = 0;

  for (const gain of gains) {
    if (gain.gain > 0) {
      if (gain.discountEligible) {
        discountEligibleGains += gain.gain;
      } else {
        nonDiscountEligibleGains += gain.gain;
      }
    }
  }

  // Apply losses proportionally
  const totalGains = discountEligibleGains + nonDiscountEligibleGains;
  const lossRatio = totalLosses / totalGains;

  const discountedLoss = discountEligibleGains * lossRatio;
  const nonDiscountLoss = nonDiscountEligibleGains * lossRatio;

  // Apply 50% discount to eligible gains after losses
  const netDiscountEligible = (discountEligibleGains - discountedLoss) * (1 - CGT_DISCOUNT_RATE);
  const netNonDiscountEligible = nonDiscountEligibleGains - nonDiscountLoss;

  const netCapitalGain = Math.max(0, netDiscountEligible + netNonDiscountEligible);
  const discountApplied = (discountEligibleGains - discountedLoss) * CGT_DISCOUNT_RATE;

  return {
    netCapitalGain: Math.round(netCapitalGain * 100) / 100,
    discountApplied: Math.round(discountApplied * 100) / 100,
  };
}

// ============================================
// FULL TAX CALCULATION
// ============================================

export interface TaxCalculationInput {
  taxableIncome: number;
  capitalGains: number;
  capitalLosses: number;
  cgtDiscountEligible: boolean;
  applyMedicareLevy: boolean;
}

/**
 * Calculate total tax liability.
 */
export function calculateTotalTax(input: TaxCalculationInput): TaxCalculationResult {
  const {
    taxableIncome: otherIncome,
    capitalGains,
    capitalLosses,
    cgtDiscountEligible,
    applyMedicareLevy,
  } = input;

  // Calculate net capital gain
  const { netCapitalGain, discountApplied } = applyCGTDiscount(
    [{ gain: capitalGains, discountEligible: cgtDiscountEligible } as CapitalGain],
    capitalLosses,
    cgtDiscountEligible
  );

  // Total taxable income
  const totalTaxableIncome = otherIncome + netCapitalGain;

  // Calculate income tax
  const incomeTax = calculateIncomeTax(totalTaxableIncome);

  // Calculate Medicare levy
  const medicareLevy = applyMedicareLevy
    ? calculateMedicareLevy(totalTaxableIncome)
    : 0;

  // Total tax
  const totalTax = incomeTax + medicareLevy;

  // Effective tax rate
  const effectiveTaxRate = totalTaxableIncome > 0
    ? (totalTax / totalTaxableIncome) * 100
    : 0;

  return {
    financialYear: getFinancialYear(new Date()),
    totalIncome: otherIncome,
    totalCapitalGains: capitalGains,
    totalCapitalLosses: capitalLosses,
    netCapitalGain,
    cgtDiscountApplied: discountApplied,
    taxableIncome: totalTaxableIncome,
    estimatedTax: incomeTax,
    medicareLevy,
    totalTax,
  };
}

// ============================================
// COST BASIS TRACKING
// ============================================

/**
 * Create a cost basis lot from a transaction.
 */
export function createCostBasisLot(
  mint: string,
  acquiredAt: Date,
  amount: number,
  costBasisAUD: number,
  method: 'FIFO' | 'LIFO' | 'SPECIFIC' = 'FIFO'
): Omit<CostBasisLot, 'id'> {
  return {
    mint,
    acquired_at: acquiredAt.toISOString(),
    amount: amount.toString(),
    cost_basis_aud: costBasisAUD.toString(),
    method,
    disposed_at: null,
    proceeds_aud: null,
  };
}

/**
 * Match disposal to cost basis lots using specified method.
 */
export function matchDisposal(
  disposals: Disposal[],
  lots: CostBasisLot[],
  method: 'FIFO' | 'LIFO' | 'SPECIFIC' = 'FIFO'
): { matched: CapitalGain[]; unmatched: Disposal[] } {
  const matched: CapitalGain[] = [];
  const unmatched: Disposal[] = [];

  const sortedLots = [...lots].sort((a, b) => {
    if (method === 'FIFO') {
      return new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime();
    } else if (method === 'LIFO') {
      return new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime();
    }
    return 0; // SPECIFIC would need manual selection
  });

  for (const disposal of disposals) {
    let remainingAmount = disposal.amount;
    let totalCostBasis = 0;
    let firstAcquiredAt: Date | null = null;

    for (const lot of sortedLots) {
      if (lot.mint !== disposal.mint) continue;
      if (remainingAmount <= 0) break;

      const lotAmount = parseFloat(lot.amount);
      const lotCostBasis = parseFloat(lot.cost_basis_aud);
      const costPerUnit = lotCostBasis / lotAmount;

      const amountToUse = Math.min(remainingAmount, lotAmount);
      totalCostBasis += amountToUse * costPerUnit;
      remainingAmount -= amountToUse;

      if (!firstAcquiredAt) {
        firstAcquiredAt = new Date(lot.acquired_at);
      }
    }

    if (remainingAmount > 0) {
      // Couldn't match full disposal
      unmatched.push({
        ...disposal,
        amount: remainingAmount,
      });
    }

    const gain = disposal.proceedsAUD - totalCostBasis;
    const holdingPeriodDays = firstAcquiredAt
      ? Math.floor((disposal.disposalDate.getTime() - firstAcquiredAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    matched.push({
      asset: disposal.mint,
      acquiredAt: firstAcquiredAt || new Date(),
      disposedAt: disposal.disposalDate,
      costBasis: totalCostBasis,
      proceeds: disposal.proceedsAUD,
      gain,
      discountEligible: holdingPeriodDays >= CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
      discountedGain: gain > 0 && holdingPeriodDays >= CGT_DISCOUNT_HOLDING_PERIOD_DAYS
        ? gain * (1 - CGT_DISCOUNT_RATE)
        : gain,
    });
  }

  return { matched, unmatched };
}
