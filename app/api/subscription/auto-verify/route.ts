// TaxMate - API: Auto-detect payment via Solana Pay reference pubkey.
//
// The client bakes a random `reference` pubkey into the Solana Pay URL. When
// the user pays via Phantom, the resulting tx includes that reference as a
// read-only account. We scan the reference's signature history to find the
// matching tx, then hand off to the normal verification flow.

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_PRICE_SOL, TREASURY_WALLET } from '@/lib/subscription';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function POST(request: NextRequest) {
  try {
    if (!TREASURY_WALLET) {
      return NextResponse.json(
        { error: 'Treasury wallet not configured.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const reference: string | undefined = body?.reference;
    if (!reference) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 });
    }

    let refPubkey: PublicKey;
    try {
      refPubkey = new PublicKey(reference);
    } catch {
      return NextResponse.json({ error: 'Invalid reference pubkey' }, { status: 400 });
    }

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const sigs = await connection.getSignaturesForAddress(refPubkey, { limit: 5 });

    if (sigs.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Walk the signatures newest-first, verify treasury received ≥ price.
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);
    const admin = createAdminClient();

    for (const entry of sigs) {
      if (entry.err) continue;
      const tx = await connection.getTransaction(entry.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      if (!tx || tx.meta?.err) continue;

      const keys =
        (tx.transaction.message as any).getAccountKeys?.().staticAccountKeys ??
        (tx.transaction.message as any).accountKeys ??
        [];
      const treasuryIdx = keys.findIndex((k: any) =>
        (k.toBase58 ? k.toBase58() : String(k)) === treasuryPubkey.toBase58()
      );
      if (treasuryIdx === -1) continue;

      const pre = tx.meta?.preBalances?.[treasuryIdx] ?? 0;
      const post = tx.meta?.postBalances?.[treasuryIdx] ?? 0;
      const deltaSol = (post - pre) / LAMPORTS_PER_SOL;
      if (deltaSol < SUBSCRIPTION_PRICE_SOL) continue;

      // Idempotent upsert — if another user already claimed this sig, reject.
      const { data: existingData } = await admin
        .from('subscriptions')
        .select('user_id')
        .eq('payment_tx_signature', entry.signature)
        .maybeSingle();
      const existing = existingData as { user_id: string } | null;

      if (existing && existing.user_id !== user.id) {
        return NextResponse.json({
          found: true,
          ok: false,
          error: 'This payment has already been used to activate another account.',
        }, { status: 409 });
      }

      if (!existing) {
        const { error: insertErr } = await admin.from('subscriptions').insert({
          user_id: user.id,
          tier: 'pro',
          payment_tx_signature: entry.signature,
          paid_amount_sol: String(deltaSol),
          treasury_wallet: TREASURY_WALLET,
          expires_at: null,
        } as any);
        if (insertErr && (insertErr as any).code !== '23505') {
          return NextResponse.json(
            { error: 'Could not record subscription.' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        found: true,
        ok: true,
        signature: entry.signature,
        paidSol: deltaSol,
      });
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error('auto-verify error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
