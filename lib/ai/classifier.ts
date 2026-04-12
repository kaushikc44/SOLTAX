// SolTax AU - AI Classification using Anthropic Claude API
// Handles ambiguous transactions that deterministic rules can't classify

import { createClient } from '@/lib/supabase/client';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Hardcoded system prompt for ATO tax classification
const SYSTEM_PROMPT = `You are an Australian crypto tax classification expert specialising in Solana DeFi transactions. You classify transactions according to ATO (Australian Taxation Office) rules for the 2025-26 financial year. You always respond with valid JSON only, no other text.`;

// Low confidence threshold - below this requires manual review
const LOW_CONFIDENCE_THRESHOLD = 0.7;

export interface AIClassification {
  classification:
    | 'SWAP'
    | 'STAKING_REWARD'
    | 'AIRDROP_STANDARD'
    | 'AIRDROP_INITIAL'
    | 'LP_DEPOSIT'
    | 'LP_WITHDRAWAL'
    | 'NFT_SALE'
    | 'TRANSFER'
    | 'SPAM'
    | 'OTHER_INCOME'
    | 'NON_TAXABLE';
  confidence: number;
  explanation: string;
  ato_rule: string;
  taxable_amount_aud: number | null;
  notes: string;
}

export interface ParsedTransaction {
  signature: string;
  block_time: Date;
  type: string;
  program_id?: string;
  program_name?: string;
  fee_sol: number;
  raw: {
    instructions: Array<{
      programId: string;
      accounts?: string[];
      parsed?: unknown;
    }>;
    meta: {
      logMessages?: string[];
      preBalances: number[];
      postBalances: number[];
      preTokenBalances?: Array<{
        mint: string;
        uiTokenAmount: {
          amount: string;
          decimals: number;
          uiAmount: number | null;
        };
      }>;
      postTokenBalances?: Array<{
        mint: string;
        uiTokenAmount: {
          amount: string;
          decimals: number;
          uiAmount: number | null;
        };
      }>;
    };
  };
}

/**
 * Build the user prompt for AI classification
 */
function buildUserPrompt(tx: ParsedTransaction, audValues?: Record<string, number>): string {
  // Extract program IDs
  const programIds = Array.from(
    new Set(tx.raw.instructions.map((i) => i.programId))
  );

  // Extract key accounts (non-program accounts)
  const knownPrograms = new Set([
    '11111111111111111111111111111111', // System
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // ATA
  ]);

  const keyAccounts = Array.from(
    new Set(
      tx.raw.instructions.flatMap((i) => i.accounts || []).filter(
        (a) => !knownPrograms.has(a)
      )
    )
  ).slice(0, 5);

  // Calculate token deltas
  const preTokenBalances = tx.raw.meta.preTokenBalances || [];
  const postTokenBalances = tx.raw.meta.postTokenBalances || [];

  const tokenDeltas: Array<{
    mint: string;
    change: number;
    audValue?: number;
  }> = [];

  const allMints = Array.from(
    new Set([...preTokenBalances.map((b) => b.mint), ...postTokenBalances.map((b) => b.mint)])
  );

  for (const mint of allMints) {
    const pre = preTokenBalances.find((b) => b.mint === mint);
    const post = postTokenBalances.find((b) => b.mint === mint);

    const preAmount = pre?.uiTokenAmount.uiAmount || 0;
    const postAmount = post?.uiTokenAmount.uiAmount || 0;
    const change = postAmount - preAmount;

    if (change !== 0) {
      tokenDeltas.push({
        mint,
        change,
        audValue: audValues?.[mint],
      });
    }
  }

  // Calculate SOL change
  const preSolBalance = tx.raw.meta.preBalances[0] || 0;
  const postSolBalance = tx.raw.meta.postBalances[0] || 0;
  const solChange = (postSolBalance - preSolBalance) / 1_000_000_000; // Convert lamports to SOL

  return `Classify this Solana transaction for ATO tax purposes.

Transaction data:
- Programs involved: ${programIds.join(', ')}
- Accounts: ${keyAccounts.join(', ')}
- Token changes in this wallet: ${tokenDeltas.map((d) => `${d.mint}: ${d.change > 0 ? '+' : ''}${d.change.toFixed(6)}${d.audValue ? ` (${d.audValue.toFixed(2)} AUD)` : ''}`).join(', ') || 'None'}
- SOL change: ${solChange > 0 ? '+' : ''}${solChange.toFixed(6)} SOL
- Block time: ${tx.block_time.toISOString()}
- AUD values at time of transaction: ${audValues ? JSON.stringify(audValues) : 'Not available'}

Respond ONLY with this JSON:
{
  "classification": "SWAP" | "STAKING_REWARD" | "AIRDROP_STANDARD" | "AIRDROP_INITIAL" | "LP_DEPOSIT" | "LP_WITHDRAWAL" | "NFT_SALE" | "TRANSFER" | "SPAM" | "OTHER_INCOME" | "NON_TAXABLE",
  "confidence": 0.0-1.0,
  "explanation": "Plain English explanation of what this transaction is and why it is classified this way under ATO rules. Maximum 2 sentences.",
  "ato_rule": "The specific ATO rule or guidance that applies",
  "taxable_amount_aud": number or null,
  "notes": "Any caveats or things the user should verify with their accountant"
}`;
}

/**
 * Parse AI response to extract classification
 */
function parseAIResponse(response: string): AIClassification {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as AIClassification;

    // Validate required fields
    if (!parsed.classification || !parsed.confidence || !parsed.explanation) {
      throw new Error('Missing required fields in AI response');
    }

    // Validate confidence range
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw new Error('Invalid AI response format');
  }
}

/**
 * Classify a single transaction using Claude API
 */
export async function classifyWithAI(
  tx: ParsedTransaction,
  audValues?: Record<string, number>
): Promise<AIClassification> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }

  const userPrompt = buildUserPrompt(tx, audValues);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No content in AI response');
    }

    return parseAIResponse(content);
  } catch (error) {
    console.error('AI classification failed:', error);
    throw error;
  }
}

/**
 * Batch classify multiple transactions with rate limiting
 * Processes in batches of 10 with 1 second delay between batches
 */
export async function batchClassify(
  transactions: Array<{ tx: ParsedTransaction; audValues?: Record<string, number> }>,
  walletId: string
): Promise<Array<{ signature: string; classification: AIClassification | null; error?: string }>> {
  const results: Array<{
    signature: string;
    classification: AIClassification | null;
    error?: string;
  }> = [];

  const BATCH_SIZE = 10;
  const RATE_LIMIT_DELAY_MS = 1000;

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(async ({ tx, audValues }) => {
        const classification = await classifyWithAI(tx, audValues);
        return { tx, classification };
      })
    );

    // Collect results
    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j];
      const tx = batch[j].tx;

      if (result.status === 'fulfilled') {
        const classification = result.value.classification;

        // Check confidence threshold
        if (classification.confidence < LOW_CONFIDENCE_THRESHOLD) {
          results.push({
            signature: tx.signature,
            classification: null,
            error: `Low confidence (${classification.confidence.toFixed(2)}) - requires manual review`,
          });
        } else {
          results.push({
            signature: tx.signature,
            classification,
          });

          // Store result in Supabase
          await storeClassificationInSupabase(
            walletId,
            tx.signature,
            classification
          );
        }
      } else {
        results.push({
          signature: tx.signature,
          classification: null,
          error: result.reason?.message || 'Classification failed',
        });
      }
    }

    // Rate limiting - wait between batches
    if (i + BATCH_SIZE < transactions.length) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  return results;
}

/**
 * Store AI classification result in Supabase
 * Note: This is a no-op placeholder - actual storage should be handled by the API route
 */
async function storeClassificationInSupabase(
  _walletId: string,
  _signature: string,
  _classification: AIClassification
): Promise<void> {
  // Storage handled by API route to avoid type conflicts
  // Implementation would use supabase.from('transactions').update() with proper typing
}

/**
 * Map AI classification to internal transaction type
 */
function mapClassificationToType(
  classification: AIClassification['classification']
): string {
  const mapping: Record<AIClassification['classification'], string> = {
    SWAP: 'swap',
    STAKING_REWARD: 'income',
    AIRDROP_STANDARD: 'income',
    AIRDROP_INITIAL: 'acquisition',
    LP_DEPOSIT: 'disposal',
    LP_WITHDRAWAL: 'disposal',
    NFT_SALE: 'disposal',
    TRANSFER: 'transfer',
    SPAM: 'spam',
    OTHER_INCOME: 'income',
    NON_TAXABLE: 'non_taxable',
  };

  return mapping[classification] || 'unknown';
}

/**
 * Check if a classification requires manual review
 */
export function needsManualReview(classification: AIClassification): boolean {
  return classification.confidence < LOW_CONFIDENCE_THRESHOLD;
}

/**
 * Get classification summary for UI display
 */
export function getClassificationSummary(
  classification: AIClassification
): {
  type: string;
  description: string;
  isTaxable: boolean;
  isIncome: boolean;
  isCGTEvent: boolean;
} {
  const taxableTypes: AIClassification['classification'][] = [
    'SWAP',
    'STAKING_REWARD',
    'AIRDROP_STANDARD',
    'LP_DEPOSIT',
    'LP_WITHDRAWAL',
    'NFT_SALE',
    'OTHER_INCOME',
  ];

  const incomeTypes: AIClassification['classification'][] = [
    'STAKING_REWARD',
    'AIRDROP_STANDARD',
    'OTHER_INCOME',
  ];

  const cgtTypes: AIClassification['classification'][] = [
    'SWAP',
    'LP_DEPOSIT',
    'LP_WITHDRAWAL',
    'NFT_SALE',
  ];

  return {
    type: classification.classification,
    description: classification.explanation,
    isTaxable: taxableTypes.includes(classification.classification),
    isIncome: incomeTypes.includes(classification.classification),
    isCGTEvent: cgtTypes.includes(classification.classification),
  };
}
