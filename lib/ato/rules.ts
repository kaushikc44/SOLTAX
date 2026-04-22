// SolTax AU - Deterministic ATO Tax Classification Engine
// Australian Tax Office rules for crypto assets (2025-26 financial year)
// NO AI - Ground truth classification based on ATO guidance

// ============================================
// CONSTANTS - 2025-26 Financial Year
// ============================================

export const FINANCIAL_YEAR_START = new Date('2025-07-01T00:00:00+10:00');
export const FINANCIAL_YEAR_END = new Date('2026-06-30T23:59:59+10:00');
export const CGT_DISCOUNT_HOLDING_PERIOD_DAYS = 365; // More than 12 months = 365+ days

// Tax brackets 2025-26 (Stage 3 tax cuts in effect)
// Rates include 2% Medicare Levy
export const TAX_BRACKETS_2025_26 = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18200, max: 45000, rate: 0.21, baseTax: 0 }, // 19% + 2% Medicare
  { min: 45000, max: 120000, rate: 0.32, baseTax: 5643 }, // 30% + 2% Medicare
  { min: 120000, max: 180000, rate: 0.39, baseTax: 29643 }, // 37% + 2% Medicare
  { min: 180000, max: Infinity, rate: 0.47, baseTax: 53043 }, // 45% + 2% Medicare
];

// ============================================
// TYPES
// ============================================

export type TransactionType =
  | 'CGT_EVENT'
  | 'ORDINARY_INCOME'
  | 'NON_TAXABLE'
  | 'NEEDS_REVIEW';

export interface ClassificationResult {
  type: TransactionType;
  subtype: string;
  taxableAmountAUD: number;
  isCGTDiscountEligible: boolean;
  holdingPeriodDays: number | null;
  rule: string;
  notes: string;
}

export interface CostBasisLot {
  id: string;
  mint: string;
  acquiredAt: Date;
  amount: number;
  costBasisAUD: number;
  method: 'FIFO' | 'LIFO' | 'SPECIFIC';
}

export interface CGTCalculationResult {
  capitalGainAUD: number;
  capitalLossAUD: number;
  discountedGainAUD: number;
  isDiscountApplied: boolean;
  holdingPeriodDays: number;
  lotsUsed: CostBasisLot[];
}

export interface TaxLiabilityResult {
  ordinaryIncomeTaxAUD: number;
  cgtTaxAUD: number;
  totalTaxAUD: number;
  marginalRate: number;
  medicareLevyIncluded: boolean;
}

// ============================================
// SPAM DETECTION
// ============================================

/**
 * Heuristic spam detection. Runs before classification so obvious dust/spam
 * tokens are filtered out of tax numbers.
 *
 * Conservative — we only flag when we're fairly sure. False positives here
 * would hide real transactions from the user's report.
 */
export function isLikelySpam(tx: {
  tx_type?: string;
  token_in_mint?: string | null;
  token_in_amount?: string | null;
  token_out_mint?: string | null;
  token_out_amount?: string | null;
  market_value_aud?: number | null;
  acquisition_cost_aud?: number | null;
  is_spam?: boolean | null;
  source?: string | null;
}): boolean {
  if (tx.is_spam) return true;

  const type = (tx.tx_type || '').toLowerCase();
  const marketValue = Number(tx.market_value_aud || 0);
  const acquisitionCost = Number(tx.acquisition_cost_aud || 0);

  // Known Solana mints that are never spam, even if pricing failed.
  const SAFE_MINTS = new Set([
    'So11111111111111111111111111111111111111112', // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  ]);
  if (tx.token_in_mint && SAFE_MINTS.has(tx.token_in_mint)) return false;
  if (tx.token_out_mint && SAFE_MINTS.has(tx.token_out_mint)) return false;

  // 1. Unsolicited airdrops of sub-cent tokens — classic spam.
  if (type === 'airdrop' && marketValue < 0.01) return true;

  // 2. Incoming transfers of unknown mints with zero AUD value — dust drops.
  //    Must be one-sided (we received something, sent nothing).
  const hasIncoming = !!(tx.token_out_mint && Number(tx.token_out_amount) > 0);
  const hasOutgoing = !!(tx.token_in_mint && Number(tx.token_in_amount) > 0);
  if ((type === 'transfer' || type === 'unknown' || type === '') && hasIncoming && !hasOutgoing) {
    if (marketValue === 0 && acquisitionCost === 0) return true;
  }

  // 3. Transactions with absolutely no AUD values and no recognised type —
  //    almost certainly unparseable dust.
  if (type && marketValue === 0 && acquisitionCost === 0 && type === 'unknown') {
    return true;
  }

  return false;
}

// ============================================
// CLASSIFICATION FUNCTION
// ============================================

/**
 * Classify a transaction according to ATO rules
 * This is the main entry point for deterministic classification
 */
export function classifyTransaction(tx: {
  tx_type: string;
  token_in_mint?: string | null;
  token_out_mint?: string | null;
  token_in_amount?: string | null;
  token_out_amount?: string | null;
  block_time: string | Date;
  ato_classification?: { type?: string; confidence?: number; explanation?: string } | null;
  is_spam?: boolean;
  market_value_aud?: number;
  acquisition_cost_aud?: number;
  holding_period_days?: number | null;
  is_initial_allocation?: boolean;
}): ClassificationResult {
  // Convert to lowercase and normalize (replace spaces, hyphens with underscores)
  const txType = (tx.tx_type || '').toLowerCase().replace(/[\s-]+/g, '_');
  const isSpam = tx.is_spam ?? false;
  const marketValueAUD = tx.market_value_aud ?? 0;
  const acquisitionCostAUD = tx.acquisition_cost_aud ?? 0;
  const holdingPeriodDays = tx.holding_period_days ?? null;
  const isInitialAllocation = tx.is_initial_allocation ?? false;

  // Handle spam airdrops first - always non-taxable
  if (isSpam && txType === 'airdrop') {
    return {
      type: 'NON_TAXABLE',
      subtype: 'spam_airdrop',
      taxableAmountAUD: 0,
      isCGTDiscountEligible: false,
      holdingPeriodDays: null,
      rule: 'ATO — zero value assets need not be declared',
      notes: 'Token identified as spam/zero value. No tax implication unless later disposed of for value.',
    };
  }

  // Route based on transaction type
  switch (txType) {
    case 'swap':
    case 'trade':
      return classifySwap(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    case 'stake':
    case 'claim_rewards':
    case 'staking_reward':
      return classifyStakingReward(tx, marketValueAUD);

    case 'airdrop':
      return classifyAirdrop(tx, marketValueAUD, isInitialAllocation);

    case 'add_liquidity':
    case 'lp_deposit':
    case 'lp_add':
    case 'increase_liquidity':
      return classifyLPDeposit(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    case 'remove_liquidity':
    case 'lp_withdraw':
    case 'lp_remove':
    case 'decrease_liquidity':
    case 'liquidity_withdrawal':
      return classifyLPWithdrawal(tx, marketValueAUD, acquisitionCostAUD);

    case 'transfer':
      return classifyTransfer(tx);

    case 'nft_sale':
    case 'nft_purchase':
    case 'nft':
    case 'nft_mint':
    case 'compressed_nft_mint':
    case 'compressed_nft_transfer':
      return classifyNFT(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    case 'wrap':
    case 'unwrap':
      return classifyWrap(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    case 'deposit':
    case 'deposit_for_burn':
      return classifyDeposit(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    case 'fulfill':
    case 'settle':
    case 'trade_settlement':
      return classifyTrade(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    case 'initialize_account':
    case 'account_setup':
      return classifyAccountSetup(tx);

    // DeFi Protocol classifications
    case 'lending_deposit':
    case 'lending_withdrawal':
      return classifyLendingTransaction(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    case 'liquidity_deposit':
    case 'liquidity_withdrawal':
      return classifyLiquidityTransaction(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    case 'perpetual_trade':
    case 'perp_trade':
    case 'drift_trade':
      return classifyPerpetualTrade(tx, marketValueAUD, acquisitionCostAUD, holdingPeriodDays);

    default:
      // If we have market values, treat as potential CGT event
      // This handles types like: DEPOSIT, FULFILL, SETTLE, etc.
      if (marketValueAUD > 0 || acquisitionCostAUD > 0) {
        const capitalGain = marketValueAUD - acquisitionCostAUD;
        return {
          type: 'CGT_EVENT',
          subtype: txType || 'disposal',
          taxableAmountAUD: capitalGain,
          isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
          holdingPeriodDays,
          rule: 'ATO — disposal with identifiable value',
          notes: `Transaction has AUD value. Capital gain: ${formatAUD(capitalGain)}. Market: ${formatAUD(marketValueAUD)}, Cost: ${formatAUD(acquisitionCostAUD)}.`,
        };
      }

      // No values available - needs manual review
      return {
        type: 'NEEDS_REVIEW',
        subtype: txType || 'unknown',
        taxableAmountAUD: 0,
        isCGTDiscountEligible: false,
        holdingPeriodDays: null,
        rule: 'ATO — transaction type requires manual review',
        notes: `Unknown transaction type "${txType}" with no AUD values. Manual classification required.`,
      };
  }
}

// ============================================
// SPECIFIC CLASSIFICATION RULES
// ============================================

/**
 * Rule 1: SWAP/TRADE - CGT Event (disposal of token A)
 */
function classifySwap(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;

  return {
    type: 'CGT_EVENT',
    subtype: 'token_swap',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
    holdingPeriodDays,
    rule: 'ATO crypto assets guidance — disposal of CGT asset',
    notes: `Swap is a disposal event. Capital gain: ${formatAUD(capitalGain)}. ${holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS ? '50% CGT discount applies (held >12 months).' : 'No CGT discount (held ≤12 months).'}`,
  };
}

/**
 * Rule 2: STAKING REWARDS - Ordinary Income
 */
function classifyStakingReward(
  tx: any,
  marketValueAUD: number
): ClassificationResult {
  return {
    type: 'ORDINARY_INCOME',
    subtype: 'staking_reward',
    taxableAmountAUD: marketValueAUD,
    isCGTDiscountEligible: false,
    holdingPeriodDays: null,
    rule: 'ATO — staking rewards treated as ordinary income',
    notes: `Staking rewards are assessable as ordinary income at AUD fair market value on receipt. Cost base = ${formatAUD(marketValueAUD)} for future CGT calculations.`,
  };
}

/**
 * Rule 3 & 4: AIRDROP - depends on whether it's initial allocation or standard
 */
function classifyAirdrop(
  tx: any,
  marketValueAUD: number,
  isInitialAllocation: boolean
): ClassificationResult {
  if (isInitialAllocation) {
    // Rule 3: Initial allocation airdrop - NOT ordinary income, cost base = $0
    return {
      type: 'NON_TAXABLE',
      subtype: 'airdrop_initial_allocation',
      taxableAmountAUD: 0,
      isCGTDiscountEligible: false,
      holdingPeriodDays: null,
      rule: 'ATO updated guidance Sep 2022 — initial allocation airdrop',
      notes: 'Initial allocation airdrop is not ordinary income. Cost base = $0. CGT event occurs only on disposal. Holding period starts from airdrop receipt.',
    };
  } else {
    // Rule 4: Standard airdrop - Ordinary income
    return {
      type: 'ORDINARY_INCOME',
      subtype: 'airdrop',
      taxableAmountAUD: marketValueAUD,
      isCGTDiscountEligible: false,
      holdingPeriodDays: null,
      rule: 'ATO — airdrop treated as ordinary income',
      notes: `Airdrop is assessable as ordinary income at AUD fair market value on receipt (${formatAUD(marketValueAUD)}). Cost base = ${formatAUD(marketValueAUD)} for future CGT calculations.`,
    };
  }
}

/**
 * Rule 5: LP DEPOSIT - CGT Event (disposal of underlying tokens)
 */
function classifyLPDeposit(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;

  return {
    type: 'CGT_EVENT',
    subtype: 'lp_deposit',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
    holdingPeriodDays,
    rule: 'ATO DeFi guidance 2023 — change of beneficial ownership',
    notes: `LP deposit constitutes disposal of underlying tokens. Capital gain: ${formatAUD(capitalGain)}. Receiving LP tokens establishes new CGT asset with cost base = market value at deposit.`,
  };
}

/**
 * Rule 6: LP WITHDRAWAL - CGT Event (disposal of LP tokens)
 */
function classifyLPWithdrawal(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;

  return {
    type: 'CGT_EVENT',
    subtype: 'lp_withdrawal',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: false,
    holdingPeriodDays: null,
    rule: 'ATO DeFi guidance 2023',
    notes: `LP withdrawal is disposal of LP tokens. Capital gain: ${formatAUD(capitalGain)}. Holding period for CGT discount depends on when LP tokens were acquired.`,
  };
}

/**
 * Rule 7: TRANSFER - NON_TAXABLE (between own wallets)
 */
function classifyTransfer(tx: any): ClassificationResult {
  return {
    type: 'NON_TAXABLE',
    subtype: 'wallet_transfer',
    taxableAmountAUD: 0,
    isCGTDiscountEligible: false,
    holdingPeriodDays: null,
    rule: 'ATO — transfer between own wallets not a disposal',
    notes: 'Transfer between wallets under same ownership is not a CGT event. No change in beneficial ownership. Cost base carries over to receiving wallet.',
  };
}

/**
 * Rule 9: NFT - CGT Event (mint, purchase, or sale)
 */
function classifyNFT(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;

  // NFT mint - typically just paying mint fee, no CGT until disposal
  if (capitalGain === 0 && acquisitionCostAUD < 1) {
    return {
      type: 'NON_TAXABLE',
      subtype: 'nft_mint',
      taxableAmountAUD: 0,
      isCGTDiscountEligible: false,
      holdingPeriodDays: null,
      rule: 'ATO — NFT mint establishes cost base',
      notes: `NFT minted. Cost base = ${formatAUD(acquisitionCostAUD)} (mint fee). No CGT event until NFT is sold.`,
    };
  }

  return {
    type: 'CGT_EVENT',
    subtype: 'nft_disposal',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
    holdingPeriodDays,
    rule: 'ATO — NFT treated as CGT asset',
    notes: `NFT transaction is a CGT event. Capital gain: ${formatAUD(capitalGain)}. ${holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS ? '50% CGT discount applies.' : 'No CGT discount.'}`,
  };
}

/**
 * Trade/Fulfill/Settle - CGT Event
 */
function classifyTrade(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;

  return {
    type: 'CGT_EVENT',
    subtype: 'trade',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
    holdingPeriodDays,
    rule: 'ATO — trade execution is a disposal',
    notes: `Trade executed. Capital gain: ${formatAUD(capitalGain)}. Market: ${formatAUD(marketValueAUD)}, Cost: ${formatAUD(acquisitionCostAUD)}.`,
  };
}

/**
 * Deposit - typically moving assets to protocol (CGT event if change of ownership)
 */
function classifyDeposit(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;

  return {
    type: 'CGT_EVENT',
    subtype: 'deposit',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
    holdingPeriodDays,
    rule: 'ATO — deposit to protocol may be disposal',
    notes: `Deposit transaction. If beneficial ownership changes, CGT applies. Gain: ${formatAUD(capitalGain)}.`,
  };
}

/**
 * Account Setup - non-taxable setup transaction
 */
function classifyAccountSetup(tx: any): ClassificationResult {
  return {
    type: 'NON_TAXABLE',
    subtype: 'account_setup',
    taxableAmountAUD: 0,
    isCGTDiscountEligible: false,
    holdingPeriodDays: null,
    rule: 'ATO — account setup not a disposal',
    notes: 'Account initialization transaction. No CGT implication - establishes account for future transactions.',
  };
}

/**
 * Lending transactions (Kamino, Drift deposits/withdrawals)
 * Deposit = CGT event (disposal of underlying asset for receipt of receipt token)
 * Withdrawal = CGT event (disposal of receipt token for underlying asset)
 */
function classifyLendingTransaction(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;
  const isDeposit = tx.tx_type.toLowerCase().includes('deposit');

  return {
    type: 'CGT_EVENT',
    subtype: isDeposit ? 'lending_deposit' : 'lending_withdrawal',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
    holdingPeriodDays,
    rule: 'ATO DeFi guidance — lending involves change of beneficial ownership',
    notes: isDeposit
      ? `Lending deposit is a CGT event. Disposal of underlying asset. Gain: ${formatAUD(capitalGain)}. Receive receipt token (e.g., kUSDC) with cost base = ${formatAUD(marketValueAUD)}.`
      : `Lending withdrawal is a CGT event. Disposal of receipt token. Gain: ${formatAUD(capitalGain)}.`,
  };
}

/**
 * Liquidity transactions (Meteora DLMM, Kamino Liquidity, Raydium CLMM)
 * Adding liquidity = CGT event (disposal of underlying tokens for LP tokens)
 * Removing liquidity = CGT event (disposal of LP tokens for underlying tokens)
 */
function classifyLiquidityTransaction(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;
  const isDeposit = tx.tx_type.toLowerCase().includes('deposit') || tx.tx_type.toLowerCase().includes('add');

  return {
    type: 'CGT_EVENT',
    subtype: isDeposit ? 'liquidity_deposit' : 'liquidity_withdrawal',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
    holdingPeriodDays,
    rule: 'ATO DeFi guidance — providing liquidity involves disposal of underlying assets',
    notes: isDeposit
      ? `Adding liquidity is a CGT event. Disposal of underlying tokens for LP/receipt tokens. Gain: ${formatAUD(capitalGain)}.`
      : `Removing liquidity is a CGT event. Disposal of LP/receipt tokens. Gain: ${formatAUD(capitalGain)}.`,
  };
}

/**
 * Perpetual/derivative trades (Drift Protocol)
 * Opening position = not CGT event (posting collateral)
 * Closing position with profit/loss = CGT event
 * PnL settlement = CGT event
 */
function classifyPerpetualTrade(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;

  return {
    type: 'CGT_EVENT',
    subtype: 'perpetual_trade',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: false, // Short-term trading, typically held <12 months
    holdingPeriodDays: holdingPeriodDays ?? 0,
    rule: 'ATO — derivative/CFD-like arrangements are CGT events',
    notes: `Perpetual trade PnL settlement. Capital gain: ${formatAUD(capitalGain)}. ${holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS ? '50% CGT discount may apply.' : 'No CGT discount (typically short-term trading).'}`,
  };
}

/**
 * Rule 10: WRAPPING - NEEDS_REVIEW (CGT event likely but uncertain)
 */
function classifyWrap(
  tx: any,
  marketValueAUD: number,
  acquisitionCostAUD: number,
  holdingPeriodDays: number | null
): ClassificationResult {
  const capitalGain = marketValueAUD - acquisitionCostAUD;

  return {
    type: 'NEEDS_REVIEW',
    subtype: 'token_wrap',
    taxableAmountAUD: capitalGain,
    isCGTDiscountEligible: holdingPeriodDays !== null && holdingPeriodDays > CGT_DISCOUNT_HOLDING_PERIOD_DAYS,
    holdingPeriodDays,
    rule: 'ATO — wrapping likely a disposal per DeFi guidance',
    notes: `Token wrapping (e.g., SOL → wSOL) is likely a CGT event per ATO DeFi guidance, but treatment is uncertain. Potential capital gain: ${formatAUD(capitalGain)}. Recommend consulting tax agent.`,
  };
}

// ============================================
// CGT CALCULATION (FIFO)
// ============================================

/**
 * Calculate capital gains using FIFO method
 * Matches disposal against acquisition lots in chronological order
 */
export function calculateCGT(
  lots: CostBasisLot[],
  disposalAmountAUD: number,
  disposalDate: Date,
  disposalQuantity: number
): CGTCalculationResult {
  // Sort lots by acquisition date (FIFO)
  const sortedLots = [...lots].sort((a, b) =>
    new Date(a.acquiredAt).getTime() - new Date(b.acquiredAt).getTime()
  );

  let remainingQuantity = disposalQuantity;
  let totalCostBasis = 0;
  let lotsUsed: CostBasisLot[] = [];
  let earliestAcquisitionDate: Date | null = null;

  for (const lot of sortedLots) {
    if (remainingQuantity <= 0) break;

    const quantityFromLot = Math.min(lot.amount, remainingQuantity);
    const proportion = quantityFromLot / lot.amount;
    const costBasisFromLot = lot.costBasisAUD * proportion;

    totalCostBasis += costBasisFromLot;
    remainingQuantity -= quantityFromLot;
    lotsUsed.push(lot);

    if (!earliestAcquisitionDate || new Date(lot.acquiredAt) < earliestAcquisitionDate) {
      earliestAcquisitionDate = new Date(lot.acquiredAt);
    }
  }

  // Calculate capital gain/loss
  const proceedsAUD = disposalAmountAUD;
  const capitalGainAUD = Math.max(0, proceedsAUD - totalCostBasis);
  const capitalLossAUD = Math.max(0, totalCostBasis - proceedsAUD);

  // Determine if CGT discount applies
  let isDiscountApplied = false;
  let discountedGainAUD = capitalGainAUD;
  let holdingPeriodDays = 0;

  if (earliestAcquisitionDate && capitalGainAUD > 0) {
    const daysHeld = Math.floor(
      (disposalDate.getTime() - earliestAcquisitionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    holdingPeriodDays = daysHeld;

    if (daysHeld > CGT_DISCOUNT_HOLDING_PERIOD_DAYS) {
      isDiscountApplied = true;
      discountedGainAUD = capitalGainAUD * 0.5; // 50% discount
    }
  }

  return {
    capitalGainAUD,
    capitalLossAUD,
    discountedGainAUD,
    isDiscountApplied,
    holdingPeriodDays,
    lotsUsed,
  };
}

// ============================================
// TAX LIABILITY CALCULATION
// ============================================

/**
 * Calculate total tax liability for 2025-26 financial year
 * Applies CGT discount before calculating tax
 */
export function calculateTaxLiability(
  ordinaryIncomeAUD: number,
  capitalGainNetAUD: number
): TaxLiabilityResult {
  // Calculate tax on ordinary income
  const ordinaryIncomeTaxAUD = calculateIncomeTax(ordinaryIncomeAUD);

  // Calculate tax on net capital gains (after 50% discount if applicable)
  // Note: capitalGainNetAUD should already have discount applied
  const cgtTaxAUD = calculateIncomeTax(capitalGainNetAUD);

  // Total tax liability
  const totalTaxAUD = ordinaryIncomeTaxAUD + cgtTaxAUD;

  // Determine marginal rate
  const totalTaxableIncome = ordinaryIncomeAUD + capitalGainNetAUD;
  const marginalRate = getMarginalRate(totalTaxableIncome);

  return {
    ordinaryIncomeTaxAUD,
    cgtTaxAUD,
    totalTaxAUD,
    marginalRate,
    medicareLevyIncluded: true,
  };
}

/**
 * Calculate income tax using 2025-26 brackets (includes Medicare levy)
 */
function calculateIncomeTax(taxableIncomeAUD: number): number {
  if (taxableIncomeAUD <= 0) return 0;

  for (const bracket of TAX_BRACKETS_2025_26) {
    if (taxableIncomeAUD > bracket.max) {
      continue;
    }

    const incomeInBracket = Math.min(taxableIncomeAUD, bracket.max) - bracket.min;
    return bracket.baseTax + (incomeInBracket * bracket.rate);
  }

  // Top bracket (no max)
  const topBracket = TAX_BRACKETS_2025_26[TAX_BRACKETS_2025_26.length - 1];
  const incomeInTopBracket = taxableIncomeAUD - topBracket.min;
  return topBracket.baseTax + (incomeInTopBracket * topBracket.rate);
}

/**
 * Get marginal tax rate for a given income level
 */
function getMarginalRate(taxableIncomeAUD: number): number {
  for (const bracket of TAX_BRACKETS_2025_26) {
    if (taxableIncomeAUD <= bracket.max) {
      return bracket.rate * 100; // Return as percentage
    }
  }

  const topBracket = TAX_BRACKETS_2025_26[TAX_BRACKETS_2025_26.length - 1];
  return topBracket.rate * 100;
}

// ============================================
// FINANCIAL YEAR UTILITIES
// ============================================

/**
 * Check if a date falls within the 2025-26 financial year
 * FY runs from 1 July to 30 June (next year)
 */
export function isInFinancialYear(date: Date): boolean {
  const normalizedDate = new Date(date);
  return normalizedDate >= FINANCIAL_YEAR_START && normalizedDate <= FINANCIAL_YEAR_END;
}

/**
 * Get the financial year for a given date
 * Returns the starting year (e.g., 2025 for FY2025-26)
 */
export function getFinancialYear(date: Date): number {
  const d = new Date(date);
  // FY starts July 1, so if month >= 7 (July), FY year is current year
  // If month < 7 (Jan-Jun), FY year is previous year
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}

/**
 * Get the date range for a financial year
 */
export function getFinancialYearRange(fyYear: number): { start: Date; end: Date } {
  const start = new Date(`${fyYear}-07-01T00:00:00+10:00`);
  const end = new Date(`${fyYear + 1}-06-30T23:59:59+10:00`);
  return { start, end };
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format number as AUD currency string
 */
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Format holding period in human-readable format
 */
export function formatHoldingPeriod(days: number): string {
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = (days / 365).toFixed(1);
    return `${years} year${years !== '1' ? 's' : ''}`;
  }
}
