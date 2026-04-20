// SolTax AU - API: Verify a Solana payment and activate Pro tier.
//
// Flow:
//   1. User sends SOL_PRICE to TREASURY_WALLET from their own wallet.
//   2. Client POSTs { signature } here.
//   3. We fetch the transaction on-chain and check that TREASURY_WALLET's
//      balance increased by at least SOL_PRICE lamports within that tx.
//   4. If valid, upsert a subscriptions row keyed on the signature (which is
//      UNIQUE) so the same payment can't activate two accounts.

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_PRICE_SOL, TREASURY_WALLET } from '@/lib/subscription';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function POST(request: NextRequest) {
  try {
    if (!TREASURY_WALLET) {
      return NextResponse.json(
        { error: 'Treasury wallet not configured. Set SOLANA_TREASURY_WALLET.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const signature: string | undefined = body?.signature?.trim();
    if (!signature) {
      return NextResponse.json({ error: 'signature is required' }, { status: 400 });
    }

    // Reject signatures already used by someone else. The table has a UNIQUE
    // constraint, but we want a clean error instead of a 500.
    const admin = createAdminClient();
    const { data } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('payment_tx_signature', signature)
      .maybeSingle();
    const existing = data as { user_id: string } | null;

    if (existing) {
      if (existing.user_id === user.id) {
        return NextResponse.json({ ok: true, alreadyActive: true });
      }
      return NextResponse.json(
        { error: 'This payment has already been used to activate another account.' },
        { status: 409 }
      );
    }

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    let tx;
    try {
      tx = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: `Could not fetch transaction: ${err?.message || 'unknown error'}` },
        { status: 400 }
      );
    }

    if (!tx || tx.meta?.err) {
      return NextResponse.json(
        { error: 'Transaction not found or failed on-chain.' },
        { status: 400 }
      );
    }

    const treasuryPubkey = new PublicKey(TREASURY_WALLET);
    // staticAccountKeys covers both legacy and v0 messages via getAccountKeys()
    // fallback; fall back to accountKeys when present.
    const accountKeys =
      (tx.transaction.message as any).getAccountKeys?.().staticAccountKeys ??
      (tx.transaction.message as any).accountKeys ??
      [];
    const treasuryIndex = accountKeys.findIndex((k: any) =>
      (k.toBase58 ? k.toBase58() : String(k)) === treasuryPubkey.toBase58()
    );

    if (treasuryIndex === -1) {
      return NextResponse.json(
        { error: 'Transaction does not involve the treasury wallet.' },
        { status: 400 }
      );
    }

    const pre = tx.meta?.preBalances?.[treasuryIndex] ?? 0;
    const post = tx.meta?.postBalances?.[treasuryIndex] ?? 0;
    const deltaLamports = post - pre;
    const deltaSol = deltaLamports / LAMPORTS_PER_SOL;

    if (deltaSol < SUBSCRIPTION_PRICE_SOL) {
      return NextResponse.json(
        {
          error: `Payment is too small. Expected ${SUBSCRIPTION_PRICE_SOL} SOL, received ${deltaSol.toFixed(4)} SOL.`,
        },
        { status: 400 }
      );
    }

    const { error: insertErr } = await admin.from('subscriptions').insert({
      user_id: user.id,
      tier: 'pro',
      payment_tx_signature: signature,
      paid_amount_sol: String(deltaSol),
      treasury_wallet: TREASURY_WALLET,
      expires_at: null,
    } as any);

    if (insertErr) {
      // Unique violation on user_id means they're already pro — treat as success.
      if ((insertErr as any).code === '23505') {
        return NextResponse.json({ ok: true, alreadyActive: true });
      }
      console.error('Subscription insert failed:', insertErr);
      return NextResponse.json(
        { error: 'Could not record subscription.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, tier: 'pro', paidSol: deltaSol });
  } catch (error) {
    console.error('Subscription verify error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
