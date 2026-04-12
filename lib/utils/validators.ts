// SolTax AU - Input Validators
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';

// ============================================
// ZOD SCHEMAS
// ============================================

/**
 * Solana address validation.
 */
export const addressSchema = z.string().refine(
  (val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid Solana address' }
);

/**
 * Wallet label validation.
 */
export const walletLabelSchema = z
  .string()
  .min(1, 'Label is required')
  .max(50, 'Label must be less than 50 characters')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Only alphanumeric, spaces, hyphens and underscores allowed');

/**
 * Financial year validation.
 */
export const financialYearSchema = z
  .number()
  .min(2020, 'Year must be 2020 or later')
  .max(new Date().getFullYear() + 1, 'Year cannot be in the future');

/**
 * Amount validation (positive numbers).
 */
export const positiveAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be a valid number');

/**
 * Cost basis input validation.
 */
export const costBasisSchema = z.object({
  mint: addressSchema,
  amount: positiveAmountSchema,
  costBasisAUD: positiveAmountSchema,
  acquiredAt: z.string().datetime('Invalid date'),
  method: z.enum(['FIFO', 'LIFO', 'SPECIFIC']).default('FIFO'),
});

/**
 * Wallet add form validation.
 */
export const addWalletSchema = z.object({
  address: addressSchema,
  label: walletLabelSchema.optional(),
});

/**
 * Report generation validation.
 */
export const reportRequestSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID'),
  financialYear: financialYearSchema,
  format: z.enum(['pdf', 'csv']).default('pdf'),
  includeSchedule: z.boolean().default(true),
});

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate Solana address.
 */
export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate signature.
 */
export function isValidSignature(signature: string): boolean {
  // Solana signatures are 87-88 characters base58
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
  return base58Regex.test(signature);
}

/**
 * Validate financial year.
 */
export function isValidFinancialYear(year: number): boolean {
  const current = new Date().getFullYear();
  return year >= 2020 && year <= current + 1;
}

/**
 * Validate wallet address ownership (check if has transaction history).
 */
export async function validateWalletHasTransactions(
  address: string,
  rpcUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [address, { limit: 1 }],
      }),
    });

    const data = await response.json();
    return Array.isArray(data.result) && data.result.length > 0;
  } catch {
    return false;
  }
}

// ============================================
// TYPE INFERENCES
// ============================================

export type AddWalletInput = z.infer<typeof addWalletSchema>;
export type CostBasisInput = z.infer<typeof costBasisSchema>;
export type ReportRequest = z.infer<typeof reportRequestSchema>;
