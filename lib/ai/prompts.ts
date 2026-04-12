// SolTax AU - AI Classification Prompts
// Prompts for Claude API transaction classification

import type { ParsedTransaction, ATOClassification, ClassificationPrompt } from '@/types';

// ============================================
// SYSTEM PROMPT
// ============================================

export const CLASSIFICATION_PROMPTS = {
  system: `You are an expert Australian tax classification assistant for SolTax AU, a Solana cryptocurrency tax engine.

Your role is to classify Solana blockchain transactions according to Australian Taxation Office (ATO) rules.

CLASSIFICATION TYPES:
1. disposal - CGT event where crypto is sold/exchanged (triggers capital gain/loss)
2. acquisition - Buying or receiving crypto (not taxable, establishes cost basis)
3. income - Assessable income like staking rewards, airdrops, mining rewards
4. gift - Transfer without consideration (deemed disposal at market value)
5. personal_use - Personal use asset under $10k (may be CGT exempt)
6. swap - Crypto-to-crypto exchange (CGT event - disposal of original asset)
7. fee - Network/gas fees (not taxable, may be deductible)
8. spam - Unsolicited tokens (generally not assessable until disposed)

KEY ATO RULES:
- Crypto-to-crypto swaps are CGT events (not like-kind exchanges)
- Staking rewards are income at market value when received
- Staking itself is NOT a disposal (you still own the asset)
- Personal use assets under $10k may be CGT exempt
- Buying crypto with AUD is NOT taxable (just acquisition)
- Transfers between own wallets are NOT taxable events
- NFTs follow same CGT rules, personal use exemption may apply

RESPONSE FORMAT:
classification: <type>
confidence: <0.0-1.0>
explanation: <brief explanation for user>
reasoning: <detailed reasoning referencing ATO rules>
notes: <optional additional notes>

Be conservative - if uncertain, classify as requiring manual review with low confidence.`,

  // User prompt templates
  userTemplate: `Transaction Details:
Signature: {{signature}}
Type: {{txType}}
Program: {{programName}}
Timestamp: {{blockTime}}
Fee: {{feeSol}} SOL

Token In: {{tokenInMint}} ({{tokenInAmount}})
Token Out: {{tokenOutMint}} ({{tokenOutAmount}})

Deterministic Classification: {{deterministicType}} (confidence: {{deterministicConfidence}})
Deterministic Explanation: {{deterministicExplanation}}

Please classify this transaction according to ATO rules.`,
} as const;

// ============================================
// PROMPT BUILDERS
// ============================================

export function buildUserPrompt(
  parsed: ParsedTransaction,
  deterministicResult: ATOClassification | null
): string {
  const template = CLASSIFICATION_PROMPTS.userTemplate;

  // Format token amounts with decimals
  const tokenInAmount = parsed.tokenIn
    ? `${formatTokenAmount(parsed.tokenIn.amount, parsed.tokenIn.decimals)} (${parsed.tokenIn.mint.slice(0, 8)}...)`
    : 'N/A';

  const tokenOutAmount = parsed.tokenOut
    ? `${formatTokenAmount(parsed.tokenOut.amount, parsed.tokenOut.decimals)} (${parsed.tokenOut.mint.slice(0, 8)}...)`
    : 'N/A';

  return template
    .replace('{{signature}}', parsed.signature.slice(0, 16) + '...')
    .replace('{{txType}}', parsed.type)
    .replace('{{programName}}', parsed.programName || 'Unknown')
    .replace('{{blockTime}}', parsed.blockTime.toISOString())
    .replace('{{feeSol}}', parsed.feeSol.toFixed(6))
    .replace('{{tokenInMint}}', parsed.tokenIn?.mint ? parsed.tokenIn.mint.slice(0, 8) + '...' : 'N/A')
    .replace('{{tokenInAmount}}', tokenInAmount)
    .replace('{{tokenOutMint}}', parsed.tokenOut?.mint ? parsed.tokenOut.mint.slice(0, 8) + '...' : 'N/A')
    .replace('{{tokenOutAmount}}', tokenOutAmount)
    .replace('{{deterministicType}}', deterministicResult?.type || 'None')
    .replace('{{deterministicConfidence}}', (deterministicResult?.confidence || 0).toFixed(2))
    .replace('{{deterministicExplanation}}', deterministicResult?.explanation || 'None');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTokenAmount(amount: string, decimals: number): string {
  try {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  } catch {
    return amount;
  }
}

// ============================================
// EDGE CASE PROMPTS
// ============================================

export const EDGE_CASE_PROMPTS = {
  // For complex DeFi transactions
  defiComplex: `This is a complex DeFi transaction that may involve multiple legs or interactions.
Focus on the economic substance rather than just the on-chain actions.
Consider: Is the user receiving value (income)? Exchanging assets (swap)? Or just moving their own assets?`,

  // For NFT transactions
  nft: `This is an NFT-related transaction. Consider:
- Is it a purchase? (acquisition, not taxable)
- Is it a sale? (disposal, CGT event)
- Is it minting? (acquisition at mint price + gas)
- Could personal use exemption apply? (if under $10k and used personally)`,

  // For staking transactions
  staking: `This is a staking-related transaction. Remember:
- Staking (delegating) is NOT a disposal
- Unstaking may or may not be a disposal depending on the protocol
- Rewards are INCOME when received
- Liquid staking tokens (like mSOL, jitoSOL) are different assets`,

  // For bridge transactions
  bridge: `This appears to be a cross-chain bridge transaction.
Bridge transactions typically involve:
- Locking tokens on source chain (disposal)
- Receiving wrapped tokens on destination chain (acquisition)
Treat as a swap for tax purposes.`,
} as const;

// ============================================
// FEW-SHOT EXAMPLES
// ============================================

export const CLASSIFICATION_EXAMPLES = [
  {
    description: 'Jupiter swap: SOL to USDC',
    classification: 'swap',
    confidence: 0.95,
    explanation: 'Crypto-to-crypto swap is a CGT event',
    reasoning: 'User exchanged SOL for USDC via Jupiter aggregator. This is a disposal of SOL at market value, triggering CGT. Cost basis of SOL is compared to proceeds (USDC value).',
  },
  {
    description: 'Marinade staking reward claim',
    classification: 'income',
    confidence: 0.95,
    explanation: 'Staking rewards are assessable income',
    reasoning: 'User received SOL rewards from Marinade staking. Per ATO guidance, staking rewards are ordinary income at market value when received. Not a CGT event.',
  },
  {
    description: 'Buying SOL with USDC',
    classification: 'acquisition',
    confidence: 0.9,
    explanation: 'Acquiring crypto, not a taxable event',
    reasoning: 'User acquired SOL by exchanging USDC. This establishes cost basis in SOL but is not itself taxable. The USDC disposed may trigger CGT if it had gained/lost value.',
  },
  {
    description: 'Transfer to own cold wallet',
    classification: 'acquisition',
    confidence: 0.85,
    explanation: 'Transfer between own wallets is not taxable',
    reasoning: 'User moved crypto to their own cold storage. No change in beneficial ownership, so not a CGT event. Keep records of transfer for cost basis tracking.',
  },
  {
    description: 'Unsolicited token airdrop',
    classification: 'income',
    confidence: 0.75,
    explanation: 'Airdrops are generally assessable as income',
    reasoning: 'User received unsolicited tokens. Per ATO, airdrops are typically ordinary income at market value. If truly unsolicited and not part of business, may argue capital nature.',
  },
] as const;

// ============================================
// VALIDATION
// ============================================

export function validateAIResponse(response: string): boolean {
  // Check for required fields
  const requiredFields = ['classification:', 'confidence:', 'explanation:'];
  for (const field of requiredFields) {
    if (!response.includes(field)) {
      return false;
    }
  }

  // Check confidence is valid number
  const confidenceMatch = response.match(/confidence:\s*([\d.]+)/);
  if (!confidenceMatch) {
    return false;
  }

  const confidence = parseFloat(confidenceMatch[1]);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    return false;
  }

  return true;
}
