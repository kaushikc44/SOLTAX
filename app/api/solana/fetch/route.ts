// SolTax AU - API: Fetch Solana Transactions using Helius
import { NextRequest, NextResponse } from 'next/server';
import { fetchTransactions, heliusToTransaction } from '@/lib/solana/helius';
import { classifyTransaction } from '@/lib/ato/rules';
import { bulkUpsertTransactions, getTransactions } from '@/lib/db/queries';
import { getHistoricalPrice, calculateAUDValue, isKnownMint } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, limit = 50, useCache = true } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    // Generate a deterministic walletId for demo mode
    const walletId = `demo_${walletAddress.slice(0, 8)}`;

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

      const classification = classifyTransaction({
        tx_type: data.tx_type,
        token_in_mint: data.token_in_mint,
        token_out_mint: data.token_out_mint,
        token_in_amount: data.token_in_amount,
        token_out_amount: data.token_out_amount,
        block_time: data.block_time,
        is_spam: data.is_spam,
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
        is_spam: data.is_spam,
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
