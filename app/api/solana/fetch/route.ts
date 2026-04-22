// TaxMate - API: Fetch Solana Transactions using Helius
import { NextRequest, NextResponse } from 'next/server';
import { fetchTransactions, heliusToTransaction } from '@/lib/solana/helius';
import { classifyTransaction, isLikelySpam } from '@/lib/ato/rules';
import {
  bulkUpsertTransactions,
  getTransactions,
  bulkInsertCostBasisLots,
} from '@/lib/db/queries';
import { getHistoricalPrice, calculateAUDValue, isKnownMint } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/server';

function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, walletId: providedWalletId, limit = 50, useCache = true } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    // If the caller passed a real wallets.id (UUID), verify the user owns it
    // and use it — this unlocks cost_basis_lots persistence. Otherwise fall
    // back to the demo_ prefix used by the unauthenticated landing flow.
    let walletId: string;
    let isRealWallet = false;
    if (providedWalletId && isUUID(providedWalletId)) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      walletId = providedWalletId;
      isRealWallet = true;
    } else {
      walletId = `demo_${walletAddress.slice(0, 8)}`;
    }

    // Try to get cached transactions from Supabase first
    if (useCache) {
      try {
        const cachedResult = await getTransactions(walletId, { limit });
        const cachedData = cachedResult.data;

        if (cachedData && cachedData.length > 0) {
          console.log(`Returning ${cachedData.length} cached transactions`);
          return NextResponse.json({
            success: true,
            transactions: cachedData,
            hasMore: false,
            count: cachedData.length,
            source: 'cache',
          });
        }
      } catch (cacheError) {
        console.warn('Cache lookup failed, fetching from chain:', cacheError);
      }
    }

    // Fetch transactions using Helius enhanced API
    const heliusTxs = await fetchTransactions(walletAddress, limit);

    if (heliusTxs.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        hasMore: false,
        message: 'No transactions found for this wallet',
      });
    }

    // First pass: convert all transactions, collect the unique (mint, day) pairs we need prices for.
    const converted = heliusTxs.map((tx) => ({
      tx,
      data: heliusToTransaction(tx, walletAddress),
    }));

    const priceKeysByMint = new Map<string, { mint: string; date: Date; key: string }>();
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const cacheKey = (mint: string, d: Date) => `${mint}:${dayKey(d)}`;

    for (const { data } of converted) {
      const txDate = new Date(data.block_time);
      if (data.token_in_mint && isKnownMint(data.token_in_mint)) {
        const k = cacheKey(data.token_in_mint, txDate);
        if (!priceKeysByMint.has(k)) {
          priceKeysByMint.set(k, { mint: data.token_in_mint, date: txDate, key: k });
        }
      }
      if (data.token_out_mint && isKnownMint(data.token_out_mint)) {
        const k = cacheKey(data.token_out_mint, txDate);
        if (!priceKeysByMint.has(k)) {
          priceKeysByMint.set(k, { mint: data.token_out_mint, date: txDate, key: k });
        }
      }
    }

    // Fetch each unique (mint, day) price once in parallel.
    const priceEntries = await Promise.all(
      Array.from(priceKeysByMint.values()).map(async ({ mint, date, key }) => {
        const price = await getHistoricalPrice(mint, date);
        return [key, price?.priceAUD ?? 0] as const;
      })
    );
    const priceByKey = new Map(priceEntries);

    // Second pass: classify and attach AUD values using the cached prices.
    const processedTransactions = converted.map(({ tx, data }) => {
      const txDate = new Date(data.block_time);
      const priceIn = data.token_in_mint
        ? priceByKey.get(cacheKey(data.token_in_mint, txDate)) ?? 0
        : 0;
      const priceOut = data.token_out_mint
        ? priceByKey.get(cacheKey(data.token_out_mint, txDate)) ?? 0
        : 0;

      let acquisitionCostAUD =
        priceIn && data.token_in_amount ? calculateAUDValue(data.token_in_amount, priceIn) : 0;
      let marketValueAUD =
        priceOut && data.token_out_amount
          ? calculateAUDValue(data.token_out_amount, priceOut)
          : 0;

      if (data.tx_type.toLowerCase() === 'swap' && marketValueAUD === 0 && acquisitionCostAUD > 0) {
        marketValueAUD = acquisitionCostAUD;
      }

      const spam = isLikelySpam({
        tx_type: data.tx_type,
        token_in_mint: data.token_in_mint,
        token_in_amount: data.token_in_amount,
        token_out_mint: data.token_out_mint,
        token_out_amount: data.token_out_amount,
        market_value_aud: marketValueAUD,
        acquisition_cost_aud: acquisitionCostAUD,
        is_spam: data.is_spam,
      });

      const classification = classifyTransaction({
        tx_type: data.tx_type,
        token_in_mint: data.token_in_mint,
        token_out_mint: data.token_out_mint,
        token_in_amount: data.token_in_amount,
        token_out_amount: data.token_out_amount,
        block_time: data.block_time,
        is_spam: spam,
        market_value_aud: marketValueAUD,
        acquisition_cost_aud: acquisitionCostAUD,
        holding_period_days: null,
      });

      return {
        wallet_id: walletId,
        signature: tx.signature,
        block_time: data.block_time,
        tx_type: data.tx_type,
        token_in_mint: data.token_in_mint,
        token_in_amount: data.token_in_amount,
        token_out_mint: data.token_out_mint,
        token_out_amount: data.token_out_amount,
        fee_sol: data.fee_sol,
        market_value_aud: marketValueAUD,
        acquisition_cost_aud: acquisitionCostAUD,
        raw_data: tx,
        ato_classification: classification,
        ai_confidence: classification.type === 'NEEDS_REVIEW' ? 0.5 : 0.9,
        ai_explanation: classification.notes,
        is_spam: spam,
        source: data.source || 'helius',
        protocol: data.protocol,
      };
    });

    // Try to store in Supabase
    try {
      await bulkUpsertTransactions(processedTransactions as any);
    } catch (dbError) {
      console.warn('Failed to cache transactions in Supabase:', dbError);
    }

    // For real wallets, persist acquisitions as cost_basis_lots so the report
    // generator can FIFO-match disposals later. Skip for demo/landing flow and
    // for spam or zero-value incoming transfers.
    if (isRealWallet) {
      const lots = processedTransactions
        .filter((tx) => {
          if (tx.is_spam) return false;
          const type = (tx.tx_type || '').toLowerCase();
          if (type === 'transfer') return false; // no CGT event
          if (!tx.token_out_mint || !tx.token_out_amount) return false;
          return (tx.market_value_aud ?? 0) > 0;
        })
        .map((tx) => ({
          wallet_id: walletId,
          mint: tx.token_out_mint as string,
          acquired_at: tx.block_time,
          amount: tx.token_out_amount as string,
          cost_basis_aud: String(tx.market_value_aud ?? 0),
          method: 'FIFO' as const,
          disposed_at: null,
          proceeds_aud: null,
        }));

      if (lots.length > 0) {
        try {
          await bulkInsertCostBasisLots(lots as any);
        } catch (lotErr) {
          console.warn('Failed to insert cost basis lots:', lotErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      transactions: processedTransactions,
      hasMore: heliusTxs.length >= limit,
      count: processedTransactions.length,
      source: 'helius',
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
