// SolTax AU - AI Classification using Google Gemini API
// Handles ambiguous transactions that deterministic rules can't classify

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ParsedTransaction,
  ATOClassification,
  AITransactionType,
  ClassificationPrompt,
} from '@/types';
import { CLASSIFICATION_PROMPTS, buildUserPrompt } from './prompts';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini client
function createClient() {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

// Confidence threshold for AI classification
const HIGH_CONFIDENCE_THRESHOLD = 0.8;
const MAX_RETRIES = 2;

export interface AIClassificationResult {
  classification: ATOTransactionType;
  confidence: number;
  explanation: string;
  reasoning: string;
  suggestedNotes?: string;
  rawResponse?: string;
}

/**
 * Classify a transaction using Gemini API.
 * Used when deterministic rules have low confidence.
 */
export async function classifyWithAI(
  parsed: ParsedTransaction,
  deterministicResult: ATOClassification | null
): Promise<AIClassificationResult> {
  const model = createClient();

  const systemPrompt = CLASSIFICATION_PROMPTS.system;
  const userPrompt = buildUserPrompt(parsed, deterministicResult);

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      const parsedResult = parseAIResponse(text);
      return parsedResult;
    } catch (error) {
      lastError = error as Error;
      console.error(`AI classification attempt ${attempt + 1} failed:`, error);

      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // All retries failed - return low confidence result
  throw lastError || new Error('AI classification failed after all retries');
}

/**
 * Batch classify multiple transactions.
 */
export async function batchClassify(
  transactions: Array<{
    parsed: ParsedTransaction;
    deterministicResult: ATOClassification | null;
  }>
): Promise<AIClassificationResult[]> {
  const results: AIClassificationResult[] = [];

  // Process in parallel with concurrency limit
  const CONCURRENCY_LIMIT = 5;

  for (let i = 0; i < transactions.length; i += CONCURRENCY_LIMIT) {
    const batch = transactions.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.allSettled(
      batch.map(tx => classifyWithAI(tx.parsed, tx.deterministicResult))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Failed classification - mark as unknown
        results.push({
          classification: 'unknown',
          confidence: 0,
          explanation: 'Classification failed',
          reasoning: result.reason?.message || 'Unknown error',
        });
      }
    }
  }

  return results;
}

/**
 * Parse AI response into structured result.
 */
function parseAIResponse(response: string): AIClassificationResult {
  // Expected format:
  // classification: <type>
  // confidence: <0-1>
  // explanation: <text>
  // reasoning: <text>
  // notes: <optional text>

  const lines = response.split('\n').map(l => l.trim());
  const result: AIClassificationResult = {
    classification: 'unknown',
    confidence: 0.5,
    explanation: '',
    reasoning: '',
  };

  for (const line of lines) {
    if (line.startsWith('classification:')) {
      const type = line.replace('classification:', '').trim().toLowerCase();
      result.classification = mapStringToType(type);
    } else if (line.startsWith('confidence:')) {
      const conf = parseFloat(line.replace('confidence:', '').trim());
      result.confidence = Math.max(0, Math.min(1, conf));
    } else if (line.startsWith('explanation:')) {
      result.explanation = line.replace('explanation:', '').trim();
    } else if (line.startsWith('reasoning:')) {
      result.reasoning = line.replace('reasoning:', '').trim();
    } else if (line.startsWith('notes:')) {
      result.suggestedNotes = line.replace('notes:', '').trim();
    }
  }

  result.rawResponse = response;
  return result;
}

/**
 * Map string to ATOTransactionType.
 */
function mapStringToType(type: string): ATOTransactionType {
  const validTypes: ATOTransactionType[] = [
    'disposal',
    'acquisition',
    'income',
    'gift',
    'personal_use',
    'swap',
    'fee',
    'spam',
  ];

  // Normalize string
  const normalized = type.toLowerCase().replace(/[^a-z_]/g, '');

  // Find matching type
  for (const validType of validTypes) {
    if (validType.includes(normalized) || normalized.includes(validType.replace(/_/g, ''))) {
      return validType;
    }
  }

  // Default based on common patterns
  if (normalized.includes('sell') || normalized.includes('dispos')) {
    return 'disposal';
  }
  if (normalized.includes('buy') || normalized.includes('acquis')) {
    return 'acquisition';
  }
  if (normalized.includes('income') || normalized.includes('reward') || normalized.includes('airdrop')) {
    return 'income';
  }
  if (normalized.includes('swap') || normalized.includes('trade') || normalized.includes('exchange')) {
    return 'swap';
  }
  if (normalized.includes('spam') || normalized.includes('scam')) {
    return 'spam';
  }

  return 'unknown';
}

/**
 * Get classification with combined deterministic + AI approach.
 */
export async function getHybridClassification(
  parsed: ParsedTransaction,
  deterministicResult: ATOClassification
): Promise<{
  result: ATOClassification;
  usedAI: boolean;
  aiResult?: AIClassificationResult;
}> {
  // If deterministic confidence is high, use it
  if (deterministicResult.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      result: deterministicResult,
      usedAI: false,
    };
  }

  // Use AI for low-confidence classifications
  try {
    const aiResult = await classifyWithAI(parsed, deterministicResult);

    // Combine results - AI takes precedence for low-confidence deterministic
    const combined: ATOClassification = {
      type: aiResult.classification,
      confidence: aiResult.confidence,
      explanation: aiResult.explanation,
      isTaxable: isTaxableType(aiResult.classification),
      isIncome: aiResult.classification === 'income',
      isCGTEvent: aiResult.classification === 'disposal' || aiResult.classification === 'swap',
      notes: aiResult.suggestedNotes || deterministicResult.notes,
    };

    return {
      result: combined,
      usedAI: true,
      aiResult,
    };
  } catch (error) {
    console.error('AI classification failed, using deterministic result:', error);
    return {
      result: deterministicResult,
      usedAI: false,
    };
  }
}

// Helper to determine if type is taxable
function isTaxableType(type: ATOTransactionType): boolean {
  const taxableTypes: ATOTransactionType[] = ['disposal', 'income', 'swap'];
  return taxableTypes.includes(type);
}
