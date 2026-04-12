// SolTax AU - Solana Transaction Parser
import { PublicKey } from '@solana/web3.js';
import type {
  SolanaTransaction,
  ParsedTransaction,
  TokenBalance,
} from '@/types';
import { PROGRAM_IDS, PROGRAM_NAMES, COMMON_TOKENS, lamportsToSol } from '@/types/solana';

// Known spam patterns
const SPAM_PATTERNS = [
  /bonk/i,
  /airdrop/i,
  /free/i,
  /claim.*reward/i,
  /mint.*free/i,
];

// Spam token mints (known spam tokens)
const SPAM_TOKENS = new Set<string>();

export interface ParseResult {
  parsed: ParsedTransaction;
  isSpam: boolean;
  spamReason?: string;
}

// Parse a Solana transaction
export function parseTransaction(tx: SolanaTransaction): ParseResult {
  const { signature, blockTime, meta, message } = tx;

  // Detect spam from logs
  const isSpam = detectSpam(tx);
  const spamReason = isSpam ? getSpamReason(tx) : undefined;

  // Parse the transaction
  const parsed: ParsedTransaction = {
    signature,
    blockTime: new Date(blockTime),
    type: 'unknown',
    feeSol: lamportsToSol(meta?.fee || 0),
    raw: tx,
  };

  // Analyze instructions
  const instructions = message.instructions;

  for (const instruction of instructions) {
    const programId = instruction.programId;
    const programName = PROGRAM_NAMES[programId];

    if (programName) {
      parsed.programId = programId;
      parsed.programName = programName;
    }

    // Parse based on program
    if (instruction.parsed) {
      const parseResult = parseInstruction(instruction, tx);

      if (parseResult) {
        parsed.type = parseResult.type;
        parsed.tokenIn = parseResult.tokenIn;
        parsed.tokenOut = parseResult.tokenOut;
      }
    }
  }

  // Analyze inner instructions for more details
  if (meta?.innerInstructions) {
    for (const inner of meta.innerInstructions) {
      for (const instruction of inner.instructions) {
        if (instruction.parsed) {
          const parseResult = parseInstruction(instruction, tx);
          if (parseResult && !parsed.tokenIn) {
            parsed.tokenIn = parseResult.tokenIn;
            parsed.tokenOut = parseResult.tokenOut;
          }
        }
      }
    }
  }

  // Detect swaps from known DEX programs
  if (parsed.programId) {
    if (parsed.programId === PROGRAM_IDS.JUPITER) {
      parsed.type = 'swap';
    } else if (parsed.programId === PROGRAM_IDS.RAYDIUM) {
      parsed.type = 'swap';
    } else if (parsed.programId === PROGRAM_IDS.ORCA) {
      parsed.type = 'swap';
    } else if (parsed.programId === PROGRAM_IDS.MARINADE) {
      parsed.type = detectStakingAction(tx);
    } else if (parsed.programId === PROGRAM_IDS.JITO) {
      parsed.type = detectStakingAction(tx);
    }
  }

  // Detect NFT transactions
  if (isNFTTransaction(tx)) {
    parsed.type = parsed.type === 'unknown' ? 'nft_purchase' : parsed.type;
  }

  return {
    parsed,
    isSpam,
    spamReason,
  };
}

// Parse individual instruction
function parseInstruction(
  instruction: SolanaTransaction['message']['instructions'][0],
  tx: SolanaTransaction
): Partial<ParsedTransaction> | null {
  const parsed = instruction.parsed;

  if (!parsed || !parsed.info) {
    return null;
  }

  const info = parsed.info as Record<string, unknown>;
  const type = parsed.type;

  // Handle transfer
  if (type === 'transfer' || type === 'transferChecked') {
    const amount = info.amount as string | undefined;
    const decimals = info.decimals as number | undefined;
    const mint = info.mint as string | undefined;
    const source = info.source as string | undefined;
    const destination = info.destination as string | undefined;

    if (amount && source && destination) {
      return {
        type: 'transfer',
        tokenIn: mint ? { mint, amount, decimals: decimals || 0 } : undefined,
      };
    }
  }

  // Handle swap instructions (Raydium, Orca)
  if (type === 'swap' || type === 'swapExactIn' || type === 'swapExactOut') {
    const amountIn = info.amountIn as string | undefined;
    const amountOut = info.amountOut as string | undefined;
    const mintIn = info.mintIn as string | undefined;
    const mintOut = info.mintOut as string | undefined;

    return {
      type: 'swap',
      tokenIn: amountIn && mintIn ? { mint: mintIn, amount: amountIn, decimals: 0 } : undefined,
      tokenOut: amountOut && mintOut ? { mint: mintOut, amount: amountOut, decimals: 0 } : undefined,
    };
  }

  return null;
}

// Detect staking actions (stake, unstake, claim)
function detectStakingAction(tx: SolanaTransaction): ParsedTransaction['type'] {
  const logs = tx.meta?.logMessages || [];

  for (const log of logs) {
    if (log.includes('stake')) {
      if (log.includes('withdraw') || log.includes('deactivate')) {
        return 'unstake';
      }
      if (log.includes('delegate')) {
        return 'stake';
      }
    }
    if (log.includes('reward') || log.includes('withdraw')) {
      return 'claim_rewards';
    }
  }

  return 'stake'; // Default
}

// Detect NFT transactions
function isNFTTransaction(tx: SolanaTransaction): boolean {
  // Check for NFT marketplace programs
  const programIds = new Set([
    PROGRAM_IDS.MAGIC_EDEN,
    PROGRAM_IDS.TENSOR,
  ]);

  for (const instruction of tx.message.instructions) {
    if (programIds.has(instruction.programId)) {
      return true;
    }
  }

  // Check logs for NFT-related actions
  const logs = tx.meta?.logMessages || [];
  for (const log of logs) {
    if (log.includes('mint') || log.includes('NFT') || log.includes('metadata')) {
      return true;
    }
  }

  return false;
}

// Detect spam transactions
function detectSpam(tx: SolanaTransaction): boolean {
  // Check logs for spam patterns
  const logs = tx.meta?.logMessages || [];
  for (const log of logs) {
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(log)) {
        return true;
      }
    }
  }

  // Check for known spam tokens in token balances
  const tokenBalances = [
    ...(tx.meta?.preTokenBalances || []),
    ...(tx.meta?.postTokenBalances || []),
  ];

  for (const balance of tokenBalances) {
    if (SPAM_TOKENS.has(balance.mint)) {
      return true;
    }
  }

  // Check for very small SOL amounts (dust attacks)
  const fee = tx.meta?.fee || 0;
  if (fee > 0) {
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];

    for (let i = 0; i < preBalances.length; i++) {
      const change = postBalances[i] - preBalances[i];
      // Received very small amount (< 0.001 SOL)
      if (change > 0 && change < 1_000_000) {
        return true;
      }
    }
  }

  return false;
}

// Get reason for spam classification
function getSpamReason(tx: SolanaTransaction): string {
  const logs = tx.meta?.logMessages || [];

  for (const log of logs) {
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(log)) {
        return `Matched spam pattern: ${pattern.source}`;
      }
    }
  }

  return 'Suspected spam transaction';
}

// Extract token transfers from transaction
export function extractTokenTransfers(tx: SolanaTransaction): Array<{
  mint: string;
  from: string;
  to: string;
  amount: string;
  decimals: number;
  uiAmount: number;
}> {
  const transfers: Array<{
    mint: string;
    from: string;
    to: string;
    amount: string;
    decimals: number;
    uiAmount: number;
  }> = [];

  const preBalances = tx.meta?.preTokenBalances || [];
  const postBalances = tx.meta?.postTokenBalances || [];

  // Compare pre and post balances to find transfers
  const balanceMap = new Map<string, { pre: TokenBalance | undefined; post: TokenBalance | undefined }>();

  for (const balance of preBalances) {
    const key = `${balance.accountIndex}-${balance.mint}`;
    balanceMap.set(key, { pre: balance, post: undefined });
  }

  for (const balance of postBalances) {
    const key = `${balance.accountIndex}-${balance.mint}`;
    const existing = balanceMap.get(key);
    if (existing) {
      existing.post = balance;
    } else {
      balanceMap.set(key, { pre: undefined, post: balance });
    }
  }

  for (const [, data] of balanceMap) {
    const pre = data.pre?.uiTokenAmount.uiAmount || 0;
    const post = data.post?.uiTokenAmount.uiAmount || 0;
    const change = post - pre;

    if (change !== 0 && data.post) {
      transfers.push({
        mint: data.post.mint,
        from: change < 0 ? (data.pre?.owner || '') : '',
        to: change > 0 ? (data.post.owner || '') : '',
        amount: Math.abs(change).toString(),
        decimals: data.post.uiTokenAmount.decimals,
        uiAmount: Math.abs(change),
      });
    }
  }

  return transfers;
}

// Get transaction type description for UI
export function getTransactionTypeDescription(type: ParsedTransaction['type']): string {
  const descriptions: Record<string, string> = {
    transfer: 'Transfer',
    swap: 'Swap / Trade',
    stake: 'Stake',
    unstake: 'Unstake',
    claim_rewards: 'Claim Rewards',
    nft_purchase: 'NFT Purchase',
    nft_sale: 'NFT Sale',
    airdrop: 'Airdrop',
    unknown: 'Unknown',
  };

  return descriptions[type] || type;
}
