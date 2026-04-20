// SolTax AU - API: Wallets CRUD
// GET   — list current user's wallets
// POST  — add a wallet (enforces free-tier 1-wallet cap → 402 Payment Required)
// DELETE — remove a wallet (?id=)

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { canAddWallet, LIMITS, SUBSCRIPTION_PRICE_SOL, TREASURY_WALLET } from '@/lib/subscription';

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ wallets: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const address: string | undefined = body?.address?.trim();
  const label: string | undefined = body?.label?.trim();

  if (!address || !isValidSolanaAddress(address)) {
    return NextResponse.json({ error: 'Invalid Solana address' }, { status: 400 });
  }

  const { allowed, tier, used, limit } = await canAddWallet(user.id);
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Free tier allows 1 wallet. Upgrade to Pro to add more.',
        code: 'WALLET_LIMIT_REACHED',
        tier,
        used,
        limit,
        upgrade: {
          priceSol: SUBSCRIPTION_PRICE_SOL,
          treasuryWallet: TREASURY_WALLET,
          proLimit: LIMITS.pro.wallets,
        },
      },
      { status: 402 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('wallets')
    .insert({ user_id: user.id, address, label: label || null } as any)
    .select()
    .single();

  if (error) {
    if ((error as any).code === '23505') {
      return NextResponse.json(
        { error: 'Wallet already added to your account.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ wallet: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('wallets').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
