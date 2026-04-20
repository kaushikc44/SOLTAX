// SolTax AU - API: Get current user's subscription status
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserTier, getWalletUsage, LIMITS, SUBSCRIPTION_PRICE_SOL, TREASURY_WALLET } from '@/lib/subscription';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [tier, walletsUsed] = await Promise.all([
    getUserTier(user.id),
    getWalletUsage(user.id),
  ]);

  return NextResponse.json({
    tier,
    walletsUsed,
    walletLimit: LIMITS[tier].wallets,
    emailReports: LIMITS[tier].emailReports,
    upgrade: {
      priceSol: SUBSCRIPTION_PRICE_SOL,
      treasuryWallet: TREASURY_WALLET,
    },
  });
}
