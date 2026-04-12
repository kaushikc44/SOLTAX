// SolTax AU - Database Queries
import type { Database } from '@/types/database';
import { createClient } from '@/lib/supabase/server';

type Tables = Database['public']['Tables'];

// ============================================
// WALLET QUERIES
// ============================================

export async function getWallets(userId: string) {
  const supabase = await createClient();

  return supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function getWallet(address: string) {
  const supabase = await createClient();

  return supabase
    .from('wallets')
    .select('*')
    .eq('address', address)
    .single();
}

export async function createWallet(data: {
  user_id: string;
  address: string;
  label?: string;
}) {
  const supabase = await createClient();

  return supabase
    .from('wallets')
    .insert({
      user_id: data.user_id,
      address: data.address,
      label: data.label || null,
    })
    .select()
    .single();
}

export async function updateWalletLabel(id: string, label: string) {
  const supabase = await createClient();

  return supabase
    .from('wallets')
    .update({ label })
    .eq('id', id)
    .select()
    .single();
}

export async function deleteWallet(id: string) {
  const supabase = await createClient();

  return supabase
    .from('wallets')
    .delete()
    .eq('id', id);
}

// ============================================
// TRANSACTION QUERIES
// ============================================

export async function getTransactions(
  walletId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    type?: string;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('wallet_id', walletId);

  if (options?.startDate) {
    query = query.gte('block_time', options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte('block_time', options.endDate.toISOString());
  }

  if (options?.type) {
    query = query.eq('tx_type', options.type);
  }

  query = query.order('block_time', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  }

  return query;
}

export async function getTransactionBySignature(walletId: string, signature: string) {
  const supabase = await createClient();

  return supabase
    .from('transactions')
    .select('*')
    .eq('wallet_id', walletId)
    .eq('signature', signature)
    .maybeSingle();
}

export async function createTransaction(data: Omit<Tables['transactions']['Insert'], 'id' | 'created_at'>) {
  const supabase = await createClient();

  return supabase
    .from('transactions')
    .insert(data)
    .select()
    .single();
}

export async function updateTransaction(
  id: string,
  data: Partial<Tables['transactions']['Update']>
) {
  const supabase = await createClient();

  return supabase
    .from('transactions')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function upsertTransaction(data: Omit<Tables['transactions']['Insert'], 'id' | 'created_at'>) {
  const supabase = await createClient();

  return supabase
    .from('transactions')
    .upsert(data, {
      onConflict: 'wallet_id,signature',
    })
    .select()
    .single();
}

// Bulk upsert for multiple transactions
export async function bulkUpsertTransactions(
  transactions: Omit<Tables['transactions']['Insert'], 'id' | 'created_at'>[]
) {
  const supabase = await createClient();

  return supabase
    .from('transactions')
    .upsert(transactions, {
      onConflict: 'wallet_id,signature',
    });
}

// ============================================
// COST BASIS QUERIES
// ============================================

export async function getCostBasisLots(walletId: string, mint?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('cost_basis_lots')
    .select('*')
    .eq('wallet_id', walletId)
    .is('disposed_at', null) // Only undisposed lots
    .order('acquired_at', { ascending: true });

  if (mint) {
    query = query.eq('mint', mint);
  }

  return query;
}

export async function createCostBasisLot(data: Omit<Tables['cost_basis_lots']['Insert'], 'id'>) {
  const supabase = await createClient();

  return supabase
    .from('cost_basis_lots')
    .insert(data)
    .select()
    .single();
}

export async function disposeCostBasisLot(
  lotId: string,
  disposedAt: string,
  proceedsAud: number
) {
  const supabase = await createClient();

  return supabase
    .from('cost_basis_lots')
    .update({
      disposed_at: disposedAt,
      proceeds_aud: proceedsAud.toString(),
    })
    .eq('id', lotId)
    .select()
    .single();
}

// ============================================
// TAX SUMMARY QUERIES
// ============================================

export async function getTaxSummary(walletId: string, financialYear: number) {
  const supabase = await createClient();

  return supabase
    .from('tax_summary')
    .select('*')
    .eq('wallet_id', walletId)
    .eq('financial_year', financialYear)
    .maybeSingle();
}

export async function getTaxSummaries(walletId: string) {
  const supabase = await createClient();

  return supabase
    .from('tax_summary')
    .select('*')
    .eq('wallet_id', walletId)
    .order('financial_year', { ascending: false });
}

export async function upsertTaxSummary(data: Omit<Tables['tax_summary']['Insert'], 'id' | 'created_at'>) {
  const supabase = await createClient();

  return supabase
    .from('tax_summary')
    .upsert(data, {
      onConflict: 'wallet_id,financial_year',
    })
    .select()
    .single();
}

// ============================================
// USER SETTINGS QUERIES
// ============================================

export async function getUserSettings(userId: string) {
  const supabase = await createClient();

  return supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
}

export async function createUserSettings(data: Omit<Tables['user_settings']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient();

  return supabase
    .from('user_settings')
    .insert(data)
    .select()
    .single();
}

export async function updateUserSettings(
  userId: string,
  data: Partial<Tables['user_settings']['Update']>
) {
  const supabase = await createClient();

  return supabase
    .from('user_settings')
    .update(data)
    .eq('user_id', userId)
    .select()
    .single();
}

// ============================================
// AGGREGATION QUERIES
// ============================================

export async function getTransactionCount(walletId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('wallet_id', walletId);

  return count || 0;
}

export async function getTransactionsByType(
  walletId: string,
  financialYear: number
) {
  const supabase = await createClient();

  // Get financial year date range
  const startDate = new Date(financialYear - 1, 6, 1); // July 1
  const endDate = new Date(financialYear, 5, 30, 23, 59, 59); // June 30

  return supabase
    .from('transactions')
    .select('tx_type, ato_classification, token_in_amount, token_out_amount')
    .eq('wallet_id', walletId)
    .gte('block_time', startDate.toISOString())
    .lte('block_time', endDate.toISOString());
}

// ============================================
// PRICE CACHE QUERIES
// ============================================

export async function getCachedPrice(mint: string, date: Date) {
  const supabase = await createClient();

  const dateStr = date.toISOString().split('T')[0];

  return supabase
    .from('price_cache')
    .select('*')
    .eq('mint', mint)
    .eq('sourced_at::date', dateStr)
    .maybeSingle();
}

export async function cachePrice(data: Omit<Tables['price_cache']['Insert'], 'id'>) {
  const supabase = await createClient();

  return supabase
    .from('price_cache')
    .upsert(data)
    .select()
    .single();
}
