// SolTax AU - API: Classify Transaction with AI
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { classifyWithAI, getHybridClassification } from '@/lib/ai/classifier';
import { classifyTransaction } from '@/lib/ato/rules';
import { updateTransaction } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, signature, parsedTransaction, useAI = true } = body;

    if (!transactionId && !signature) {
      return NextResponse.json(
        { error: 'transactionId or signature is required' },
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

    // Get transaction from database
    let transaction;
    if (transactionId) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, wallets(user_id)')
        .eq('id', transactionId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }

      // Verify ownership
      if (data.wallets.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      transaction = data;
    }

    // Get deterministic classification
    const deterministicResult = classifyTransaction(parsedTransaction);

    // If confidence is high, no need for AI
    if (!useAI || deterministicResult.confidence >= 0.8) {
      return NextResponse.json({
        success: true,
        classification: deterministicResult,
        usedAI: false,
      });
    }

    // Use AI for classification
    const result = await getHybridClassification(parsedTransaction, deterministicResult);

    // Update transaction in database
    if (transactionId) {
      await updateTransaction(transactionId, {
        ato_classification: result.result,
        ai_confidence: result.aiResult?.confidence || result.result.confidence,
        ai_explanation: result.aiResult?.explanation || result.result.explanation,
      });
    }

    return NextResponse.json({
      success: true,
      classification: result.result,
      usedAI: result.usedAI,
      aiResult: result.aiResult,
    });
  } catch (error) {
    console.error('Error classifying transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to classify transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
