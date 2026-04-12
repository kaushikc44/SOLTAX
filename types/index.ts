// SolTax AU - Shared Type Definitions

import type { wallets, transactions, cost_basis_lots, tax_summary, user_settings } from './database';

// Re-export database types
export type Wallet = wallets;
export type Transaction = transactions;
export type CostBasisLot = cost_basis_lots;
export type TaxSummary = tax_summary;
export type UserSettings = user_settings;

// ============================================
// SOLANA TYPES
// ============================================

export interface SolanaTransaction {
  signature: string;
  blockTime: number;
  slot: number;
  message: {
    accountKeys: Array<{
      pubkey: string;
      signer: boolean;
      source: string;
      writable: boolean;
    }>;
    instructions: SolanaInstruction[];
    recentBlockhash: string;
  };
  meta: {
    err: unknown | null;
    fee: number;
    innerInstructions?: Array<{
      index: number;
      instructions: SolanaInstruction[];
    }>;
    logMessages: string[];
    postBalances: number[];
    preBalances: number[];
    postTokenBalances?: TokenBalance[];
    preTokenBalances?: TokenBalance[];
    rewards?: Reward[];
  };
}

export interface SolanaInstruction {
  programId: string;
  accounts?: string[];
  data?: string;
  parsed?: {
    info: Record<string, unknown>;
    type: string;
  };
}

export interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
  };
}

export interface Reward {
  pubkey: string;
  lamports: number;
  postBalance: number | null;
  rewardType: string | null;
}

export interface ParsedTransaction {
  signature: string;
  blockTime: Date;
  type: TransactionType;
  tokenIn?: {
    mint: string;
    amount: string;
    decimals: number;
  };
  tokenOut?: {
    mint: string;
    amount: string;
    decimals: number;
  };
  feeSol: number;
  programId?: string;
  programName?: string;
  raw: SolanaTransaction;
}

export type TransactionType =
  | 'transfer'
  | 'swap'
  | 'stake'
  | 'unstake'
  | 'claim_rewards'
  | 'nft_purchase'
  | 'nft_sale'
  | 'airdrop'
  | 'unknown';

// ============================================
// ATO/TAX TYPES
// ============================================

export type ATOTransactionType =
  | 'disposal'           // CGT event - selling crypto
  | 'acquisition'        // Buying crypto (not taxable)
  | 'income'             // Assessable income (staking rewards, airdrops)
  | 'gift'               // Gift/deemed disposal
  | 'personal_use'       // Personal use asset (under $10k)
  | 'swap'               // Crypto-to-crypto swap (CGT event)
  | 'fee'                // Transaction fee
  | 'spam';              // Spam transaction (ignored)

export interface ATOClassification {
  type: ATOTransactionType;
  confidence: number;
  explanation: string;
  isTaxable: boolean;
  isIncome: boolean;
  isCGTEvent: boolean;
  notes?: string;
}

export interface CapitalGain {
  asset: string;
  acquiredAt: Date;
  disposedAt: Date;
  costBasis: number;
  proceeds: number;
  gain: number;
  discountEligible: boolean;
  discountedGain: number;
}

export interface TaxCalculationResult {
  financialYear: number;
  totalIncome: number;
  totalCapitalGains: number;
  totalCapitalLosses: number;
  netCapitalGain: number;
  cgtDiscountApplied: number;
  taxableIncome: number;
  estimatedTax: number;
  medicareLevy: number;
  totalTax: number;
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  baseTax: number;
}

// ============================================
// AI CLASSIFICATION TYPES
// ============================================

export interface AIClassificationRequest {
  transactionSignature: string;
  rawTransaction: string;
  parsedData: ParsedTransaction;
  deterministicResult: ATOClassification | null;
  confidence: number;
}

export interface AIClassificationResponse {
  classification: ATOTransactionType;
  confidence: number;
  explanation: string;
  reasoning: string;
  suggestedNotes?: string;
}

export interface ClassificationPrompt {
  system: string;
  user: string;
}

// ============================================
// REPORT TYPES
// ============================================

export interface TaxReport {
  walletId: string;
  walletLabel: string | null;
  financialYear: number;
  generatedAt: Date;
  summary: TaxCalculationResult;
  transactions: Transaction[];
  capitalGains: CapitalGain[];
  incomeTransactions: Transaction[];
}

export interface ReportFormat {
  type: 'pdf' | 'csv';
  includeSchedule: boolean;
  includeRawData: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================
// UTILITY TYPES
// ============================================

export type FinancialYear = number; // e.g., 2024 means FY2024 (Jul 2023 - Jun 2024)

export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId?: string;
}

export interface PriceData {
  mint: string;
  priceAUD: number;
  timestamp: Date;
  source: 'coingecko' | 'manual' | 'cache';
}

export interface WalletWithBalance extends Wallet {
  balanceSol: number;
  transactionCount: number;
}
