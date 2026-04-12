// SolTax AU - Zod Schemas for Database Validation
import { z } from 'zod';

// ============================================
// WALLET SCHEMAS
// ============================================

export const walletInsertSchema = z.object({
  user_id: z.string().uuid(),
  address: z.string().min(32).max(44),
  label: z.string().max(100).optional().nullable(),
});

export const walletUpdateSchema = walletInsertSchema.partial();

// ============================================
// TRANSACTION SCHEMAS
// ============================================

export const transactionInsertSchema = z.object({
  wallet_id: z.string().uuid(),
  signature: z.string().min(80).max(88),
  block_time: z.string().datetime(),
  tx_type: z.string().max(50),
  token_in_mint: z.string().max(44).optional().nullable(),
  token_in_amount: z.string().optional().nullable(),
  token_out_mint: z.string().max(44).optional().nullable(),
  token_out_amount: z.string().optional().nullable(),
  fee_sol: z.string().optional().nullable(),
  raw_data: z.record(z.unknown()),
  ato_classification: z.record(z.unknown()).optional().nullable(),
  ai_confidence: z.number().min(0).max(1).optional().nullable(),
  ai_explanation: z.string().optional().nullable(),
  is_spam: z.boolean().default(false),
});

export const transactionUpdateSchema = transactionInsertSchema.partial();

// ============================================
// COST BASIS SCHEMAS
// ============================================

export const costBasisLotInsertSchema = z.object({
  wallet_id: z.string().uuid(),
  mint: z.string().min(32).max(44),
  acquired_at: z.string().datetime(),
  amount: z.string(),
  cost_basis_aud: z.string(),
  method: z.enum(['FIFO', 'LIFO', 'SPECIFIC']).default('FIFO'),
  disposed_at: z.string().datetime().optional().nullable(),
  proceeds_aud: z.string().optional().nullable(),
});

export const costBasisLotUpdateSchema = costBasisLotInsertSchema.partial();

// ============================================
// TAX SUMMARY SCHEMAS
// ============================================

export const taxSummaryInsertSchema = z.object({
  wallet_id: z.string().uuid(),
  financial_year: z.number().min(2020).max(2100),
  total_income_aud: z.string().default('0'),
  total_cgt_gains: z.string().default('0'),
  total_cgt_losses: z.string().default('0'),
  net_capital_gain: z.string().default('0'),
  cgt_discount_applied: z.boolean().default(false),
});

export const taxSummaryUpdateSchema = taxSummaryInsertSchema.partial();

// ============================================
// USER SETTINGS SCHEMAS
// ============================================

export const userSettingsInsertSchema = z.object({
  user_id: z.string().uuid(),
  tax_resident_country: z.string().length(2).default('AU'),
  marginal_tax_rate: z.number().min(0).max(50).default(32.5),
  apply_medicare_levy: z.boolean().default(true),
  cgt_discount_eligible: z.boolean().default(true),
});

export const userSettingsUpdateSchema = userSettingsInsertSchema.partial();

// ============================================
// PRICE CACHE SCHEMAS
// ============================================

export const priceCacheInsertSchema = z.object({
  mint: z.string().min(32).max(44),
  price_aud: z.string(),
  sourced_at: z.string().datetime(),
  source: z.string().default('coingecko'),
});

export const priceCacheUpdateSchema = priceCacheInsertSchema.partial();

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const fetchTransactionsRequestSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  limit: z.number().min(1).max(100).default(50),
  beforeSignature: z.string().optional(),
});

export const classifyTransactionRequestSchema = z.object({
  signature: z.string(),
  rawTransaction: z.string(),
  parsedData: z.record(z.unknown()),
});

export const generateReportRequestSchema = z.object({
  walletId: z.string().uuid(),
  financialYear: z.number().min(2020).max(2100),
  format: z.enum(['pdf', 'csv']).default('pdf'),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type WalletInsert = z.infer<typeof walletInsertSchema>;
export type TransactionInsert = z.infer<typeof transactionInsertSchema>;
export type CostBasisLotInsert = z.infer<typeof costBasisLotInsertSchema>;
export type TaxSummaryInsert = z.infer<typeof taxSummaryInsertSchema>;
export type UserSettingsInsert = z.infer<typeof userSettingsInsertSchema>;

export type FetchTransactionsRequest = z.infer<typeof fetchTransactionsRequestSchema>;
export type GenerateReportRequest = z.infer<typeof generateReportRequestSchema>;
