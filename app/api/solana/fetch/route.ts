// SolTax AU - API: Fetch Solana Transactions
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createConnection } from '@/lib/solana/connection';
import { fetchWalletTransactions } from '@/lib/solana/fetcher';
import { parseTransaction } from '@/lib/solana/parser';
import { classifyTransaction } from '@/lib/ato/rules';
import { bulkUpsertTransactions, createCostBasisLot } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, walletId, limit = 50 } = body;

    if (!walletAddress || !walletId) {
      return NextResponse.json(
        { error: 'walletAddress and walletId are required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify wallet belongs to user
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found or does not belong to user' },
        { status: 404 }
      );
    }

    // Create Solana connection
    const connection = createConnection();

    // Fetch transactions
    const { transactions, hasMore, nextBeforeSignature } = await fetchWalletTransactions(
      connection,
      walletAddress,
      { limit }
    );

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        hasMore: false,
        message: 'No transactions found',
      });
    }

    // Parse and classify transactions
    const processedTransactions = transactions.map((tx) => {
      const { parsed, isSpam, spamReason } = parseTransaction(tx);
      const classification = classifyTransaction(parsed);

      return {
        wallet_id: walletId,
        signature: tx.signature,
        block_time: new Date(tx.blockTime).toISOString(),
        tx_type: parsed.type,
        token_in_mint: parsed.tokenIn?.mint || null,
        token_in_amount: parsed.tokenIn?.amount || null,
        token_out_mint: parsed.tokenOut?.mint || null,
        token_out_amount: parsed.tokenOut?.amount || null,
        fee_sol: parsed.feeSol.toString(),
        raw_data: tx,
        ato_classification: classification,
        ai_confidence: classification.confidence,
        ai_explanation: classification.explanation,
        is_spam: isSpam,
      };
    });

    // Store transactions in database
    await bulkUpsertTransactions(processedTransactions);

    return NextResponse.json({
      success: true,
      transactions: processedTransactions,
      hasMore,
      nextBeforeSignature,
      count: processedTransactions.length,
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
