// SolTax AU - API: Classify Transaction with AI
import { NextRequest, NextResponse } from 'next/server';
import { classifyWithAI } from '@/lib/ai/classifier';
import { classifyTransaction } from '@/lib/ato/rules';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signature, parsedTransaction, audValues } = body;

    if (!signature) {
      return NextResponse.json(
        { error: 'signature is required' },
        { status: 400 }
      );
    }

    // Get deterministic classification first
    const deterministicResult = classifyTransaction(parsedTransaction);

    // If confidence is high, no need for AI
    if (deterministicResult.type !== 'NEEDS_REVIEW' && deterministicResult.type !== 'NON_TAXABLE') {
      return NextResponse.json({
        success: true,
        classification: deterministicResult,
        usedAI: false,
      });
    }

    // Use AI for classification
    const aiResult = await classifyWithAI(parsedTransaction, audValues);

    return NextResponse.json({
      success: true,
      classification: {
        ...deterministicResult,
        type: aiResult.classification,
        subtype: aiResult.classification.toLowerCase(),
        taxableAmountAUD: aiResult.taxable_amount_aud || 0,
        isCGTDiscountEligible: aiResult.classification === 'SWAP' || aiResult.classification === 'NFT_SALE',
        holdingPeriodDays: null,
        rule: aiResult.ato_rule,
        notes: aiResult.notes,
      },
      usedAI: true,
      aiResult,
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
