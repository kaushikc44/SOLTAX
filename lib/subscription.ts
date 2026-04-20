// SolTax AU - Subscription helpers
//
// Pricing & entitlements live here so we don't leak magic numbers across the app.

import { createAdminClient } from '@/lib/supabase/server';

export const SUBSCRIPTION_PRICE_SOL = Number(process.env.SUBSCRIPTION_PRICE_SOL || '0.1');
export const TREASURY_WALLET = process.env.SOLANA_TREASURY_WALLET || '';

export const LIMITS = {
  free: { wallets: 1, emailReports: false },
  pro: { wallets: 50, emailReports: true },
} as const;

export type Tier = keyof typeof LIMITS;

export async function getUserTier(userId: string): Promise<Tier> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('tier, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  const row = data as { tier: Tier; expires_at: string | null } | null;
  if (!row) return 'free';
  if (row.expires_at && new Date(row.expires_at) < new Date()) return 'free';
  return 'pro';
}

export async function getWalletUsage(userId: string) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('wallets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

export async function canAddWallet(userId: string) {
  const [tier, used] = await Promise.all([getUserTier(userId), getWalletUsage(userId)]);
  const limit = LIMITS[tier].wallets;
  return { allowed: used < limit, tier, used, limit };
}
