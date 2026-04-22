// TaxMate - Report calculation
//
// Takes the transactions + cost-basis lots pulled from Supabase and produces:
//   - an ordinary-income total,
//   - a per-disposal CGT schedule (FIFO-matched against lots),
//   - CGT gains / losses / discount applied,
//   - a final TaxLiabilityResult using the 2025-26 Australian brackets.
//
// The DB stores amounts as strings (NUMERIC(78,0)) and AUD values as strings
// too (NUMERIC(18,2)). We parseFloat everywhere — not ideal for precision but
// fine for tax reporting at human scales.

import type { transactions as TxRow, cost_basis_lots as LotRow } from '@/types/database';
import {
  classifyTransaction,
  calculateCGT,
  calculateTaxLiability,
  CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
  type CGTCalculationResult,
  type ClassificationResult,
} from '@/lib/ato/rules';

export interface ReportGain {
  asset: string;
  acquiredAt: Date;
  disposedAt: Date;
  costBasis: number;
  proceeds: number;
  gain: number;
  discountEligible: boolean;
  discountedGain: number;
}

export interface ReportComputation {
  ordinaryIncome: number;
  totalCapitalGains: number;
  totalCapitalLosses: number;
  netCapitalGain: number; // after losses + 50% discount
  cgtDiscountApplied: number;
  gains: ReportGain[];
  classifications: ClassificationResult[];
  tax: {
    incomeTax: number;
    cgtTax: number;
    totalTax: number;
    marginalRate: number;
    medicareLevy: number;
  };
}

interface MutableLot {
  id: string;
  mint: string;
  acquiredAt: Date;
  amount: number;        // remaining amount in lot
  costBasisAUD: number;  // remaining basis proportional to remaining amount
  originalAmount: number;
  originalBasis: number;
}

function toMutable(lot: LotRow): MutableLot {
  const amount = parseFloat(lot.amount);
  const basis = parseFloat(lot.cost_basis_aud);
  return {
    id: lot.id,
    mint: lot.mint,
    acquiredAt: new Date(lot.acquired_at),
    amount,
    costBasisAUD: basis,
    originalAmount: amount,
    originalBasis: basis,
  };
}

export function computeReport(
  txs: TxRow[],
  lots: LotRow[],
  opts: { applyMedicareLevy?: boolean; cgtDiscountEligible?: boolean } = {}
): ReportComputation {
  const applyMedicareLevy = opts.applyMedicareLevy !== false;

  // Group mutable lots by mint so FIFO order is preserved per asset.
  const lotsByMint = new Map<string, MutableLot[]>();
  for (const lot of lots) {
    const ml = toMutable(lot);
    const arr = lotsByMint.get(ml.mint) || [];
    arr.push(ml);
    lotsByMint.set(ml.mint, arr);
  }
  for (const arr of Array.from(lotsByMint.values())) {
    arr.sort((a, b) => a.acquiredAt.getTime() - b.acquiredAt.getTime());
  }

  // Sort disposals chronologically so we deduct from the right lots.
  const sortedTxs = [...txs].sort(
    (a, b) => new Date(a.block_time).getTime() - new Date(b.block_time).getTime()
  );

  let ordinaryIncome = 0;
  const gains: ReportGain[] = [];
  const classifications: ClassificationResult[] = [];
  let totalCapitalGains = 0;
  let totalCapitalLosses = 0;
  let discountEligibleGains = 0;

  for (const tx of sortedTxs) {
    const classified = classifyTransaction({
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
    classifications.push(classified);

    if (classified.type === 'ORDINARY_INCOME') {
      ordinaryIncome += classified.taxableAmountAUD;
      continue;
    }
    if (classified.type !== 'CGT_EVENT') continue;

    // For CGT events, the disposal is the token_in side.
    const disposalMint = tx.token_in_mint;
    const disposalAmount = parseFloat(tx.token_in_amount || '0');
    const proceedsAUD = Number(tx.market_value_aud || 0);
    if (!disposalMint || disposalAmount <= 0) continue;

    const mintLots = lotsByMint.get(disposalMint) || [];
    const disposalDate = new Date(tx.block_time);

    // FIFO-match against the remaining mutable lots.
    const snapshot = mintLots.map((l) => ({
      id: l.id,
      mint: l.mint,
      acquiredAt: l.acquiredAt,
      amount: l.amount,
      costBasisAUD: l.costBasisAUD,
      method: 'FIFO' as const,
    }));

    const cgt: CGTCalculationResult = calculateCGT(
      snapshot,
      proceedsAUD,
      disposalDate,
      disposalAmount
    );

    // Deduct consumed amount from the mutable lots (oldest-first).
    let remaining = disposalAmount;
    let firstAcquired: Date | null = null;
    for (const lot of mintLots) {
      if (remaining <= 0 || lot.amount <= 0) continue;
      if (!firstAcquired) firstAcquired = lot.acquiredAt;
      const used = Math.min(lot.amount, remaining);
      const perUnit = lot.originalAmount > 0 ? lot.originalBasis / lot.originalAmount : 0;
      lot.amount -= used;
      lot.costBasisAUD = Math.max(0, lot.costBasisAUD - used * perUnit);
      remaining -= used;
    }
    lotsByMint.set(
      disposalMint,
      mintLots.filter((l) => l.amount > 1e-9)
    );

    const gain = cgt.capitalGainAUD - cgt.capitalLossAUD;
    gains.push({
      asset: disposalMint,
      acquiredAt: firstAcquired || disposalDate,
      disposedAt: disposalDate,
      costBasis: proceedsAUD - gain,
      proceeds: proceedsAUD,
      gain,
      discountEligible: cgt.isDiscountApplied,
      discountedGain: cgt.discountedGainAUD,
    });

    if (gain >= 0) {
      totalCapitalGains += gain;
      if (cgt.isDiscountApplied) discountEligibleGains += gain;
    } else {
      totalCapitalLosses += Math.abs(gain);
    }
  }

  // Apply losses against gains (losses reduce gains £-for-£, preferring
  // non-discount gains first to maximise the effective discount).
  let nonDiscountGains = totalCapitalGains - discountEligibleGains;
  let discountGains = discountEligibleGains;
  let losses = totalCapitalLosses;

  const offsetNon = Math.min(nonDiscountGains, losses);
  nonDiscountGains -= offsetNon;
  losses -= offsetNon;

  const offsetDiscount = Math.min(discountGains, losses);
  discountGains -= offsetDiscount;
  losses -= offsetDiscount;

  const cgtDiscountApplied = opts.cgtDiscountEligible === false ? 0 : discountGains * 0.5;
  const netCapitalGain = Math.max(0, nonDiscountGains + discountGains - cgtDiscountApplied);

  const tax = calculateTaxLiability(ordinaryIncome, netCapitalGain);

  // tax.totalTaxAUD already folds Medicare in via the bracket rates.
  const medicareLevy = applyMedicareLevy ? (ordinaryIncome + netCapitalGain) * 0.02 : 0;

  return {
    ordinaryIncome,
    totalCapitalGains,
    totalCapitalLosses,
    netCapitalGain,
    cgtDiscountApplied,
    gains,
    classifications,
    tax: {
      incomeTax: tax.ordinaryIncomeTaxAUD,
      cgtTax: tax.cgtTaxAUD,
      totalTax: tax.totalTaxAUD,
      marginalRate: tax.marginalRate,
      medicareLevy,
    },
  };
}
