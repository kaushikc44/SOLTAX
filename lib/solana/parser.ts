// SolTax AU - Solana Transaction Parser
// Parses raw Solana transactions into internal format with type detection
import { PROGRAM_IDS, PROGRAM_NAMES, COMMON_TOKENS, lamportsToSol } from '@/types/solana';

// Program ID constants (including additional programs)
const JUPITER_V6 = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
const RAYDIUM_AMM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const KAMINO = '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc';
const MARINADE = 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const METAPLEX = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

export interface ParsedTransaction {
  signature: string;
  block_time: Date;
  type: TransactionType;
  token_in?: {
    mint: string;
    amount: string;
    decimals: number;
  };
  token_out?: {
    mint: string;
    amount: string;
    decimals: number;
  };
  fee_sol: number;
  program_id?: string;
  program_name?: string;
  raw: RawTransaction;
  is_spam?: boolean;
}

export type TransactionType =
  | 'swap'
  | 'transfer'
  | 'stake'
  | 'unstake'
  | 'claim_rewards'
  | 'airdrop'
  | 'staking_reward'
  | 'lp_deposit'
  | 'lp_withdraw'
  | 'nft_purchase'
  | 'nft_sale'
  | 'wrap'
  | 'unwrap'
  | 'unknown';

interface RawTransaction {
  signature: string;
  block_time: number;
  fee: number;
  accounts: string[];
  instructions: Array<{
    programId: string;
    accounts?: string[];
    data?: string;
    parsed?: unknown;
  }>;
  meta: {
    err: unknown | null;
    fee: number;
    innerInstructions?: Array<{
      index: number;
      instructions: Array<{
        programId: string;
        accounts?: string[];
        data?: string;
        parsed?: unknown;
      }>;
    }>;
    logMessages?: string[];
    postBalances: number[];
    preBalances: number[];
    postTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      uiTokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number | null;
      };
      owner?: string;
    }>;
    preTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      uiTokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number | null;
      };
      owner?: string;
    }>;
    rewards?: Array<{
      pubkey: string;
      lamports: number;
      postBalance: number | null;
      rewardType: string | null;
    }>;
  };
}

interface TokenInfo {
  mint: string;
  amount: string;
  decimals: number;
}

// Known spam patterns
const SPAM_PATTERNS = [
  /bonk/i,
  /airdrop/i,
  /free/i,
  /claim.*reward/i,
  /mint.*free/i,
];

// Known own wallet addresses (would be populated from user's wallets)
let knownWalletAddresses = new Set<string>();

export function setKnownWalletAddresses(addresses: string[]): void {
  knownWalletAddresses = new Set(addresses);
}

/**
 * Parse a raw Solana transaction into our internal format
 */
export function parseTransaction(tx: RawTransaction): ParsedTransaction {
  const baseParsed: ParsedTransaction = {
    signature: tx.signature,
    block_time: new Date(tx.block_time * 1000),
    type: 'unknown',
    fee_sol: lamportsToSol(tx.fee),
    raw: tx,
  };

  // Check for spam first
  if (isSpam(tx)) {
    return {
      ...baseParsed,
      type: 'unknown',
      is_spam: true,
    };
  }

  // Detect transaction type from instructions
  const detectedType = detectTransactionType(tx);

  return {
    ...baseParsed,
    type: detectedType.type,
    token_in: detectedType.token_in,
    token_out: detectedType.token_out,
    program_id: detectedType.program_id,
    program_name: detectedType.program_name,
  };
}

/**
 * Detect transaction type by analyzing program IDs and instructions
 */
function detectTransactionType(tx: RawTransaction): {
  type: TransactionType;
  token_in?: TokenInfo;
  token_out?: TokenInfo;
  program_id?: string;
  program_name?: string;
} {
  const instructions = tx.instructions;
  const logs = tx.meta.logMessages || [];

  // Find the primary program involved
  const primaryProgram = findPrimaryProgram(instructions);

  if (!primaryProgram) {
    // Check for simple SOL transfer
    if (isSimpleSolTransfer(tx)) {
      return { type: 'transfer' };
    }
    return { type: 'unknown' };
  }

  // Jupiter V6 - Swap aggregator
  if (primaryProgram.programId === JUPITER_V6) {
    const tokens = extractSwapTokens(tx);
    return {
      type: 'swap',
      token_in: tokens.tokenIn,
      token_out: tokens.tokenOut,
      program_id: primaryProgram.programId,
      program_name: 'Jupiter',
    };
  }

  // Raydium AMM - DEX swap
  if (primaryProgram.programId === RAYDIUM_AMM) {
    const tokens = extractSwapTokens(tx);
    return {
      type: 'swap',
      token_in: tokens.tokenIn,
      token_out: tokens.tokenOut,
      program_id: primaryProgram.programId,
      program_name: 'Raydium',
    };
  }

  // Kamino - Lending or Staking
  if (primaryProgram.programId === KAMINO) {
    const action = detectKaminoAction(logs);
    if (action === 'deposit') {
      return {
        type: 'lp_deposit',
        program_id: primaryProgram.programId,
        program_name: 'Kamino',
      };
    }
    if (action === 'withdraw') {
      return {
        type: 'lp_withdraw',
        program_id: primaryProgram.programId,
        program_name: 'Kamino',
      };
    }
    if (action === 'stake') {
      return {
        type: 'stake',
        program_id: primaryProgram.programId,
        program_name: 'Kamino',
      };
    }
    if (action === 'claim_rewards') {
      return {
        type: 'claim_rewards',
        program_id: primaryProgram.programId,
        program_name: 'Kamino',
      };
    }
    return {
      type: 'unknown',
      program_id: primaryProgram.programId,
      program_name: 'Kamino',
    };
  }

  // Marinade - Staking
  if (primaryProgram.programId.startsWith('MarBms')) {
    const action = detectMarinadeAction(logs, tx);
    return {
      type: action,
      program_id: primaryProgram.programId,
      program_name: 'Marinade',
    };
  }

  // System Program - Check for transfers
  if (primaryProgram.programId === SYSTEM_PROGRAM) {
    if (isTransferBetweenOwnWallets(tx)) {
      return { type: 'transfer' };
    }
    return { type: 'transfer' };
  }

  // Token Program - Check for mints (airdrops/rewards)
  if (primaryProgram.programId === TOKEN_PROGRAM) {
    const mintAction = detectTokenMint(tx);
    if (mintAction) {
      return mintAction;
    }
  }

  // Metaplex - NFT transactions
  if (primaryProgram.programId === METAPLEX) {
    const nftAction = detectNFTAction(tx);
    if (nftAction) {
      return nftAction;
    }
  }

  // Check logs for wrapping/unwrapping SOL
  if (isWrapUnwrap(tx)) {
    return {
      type: isWrap(tx) ? 'wrap' : 'unwrap',
      program_id: primaryProgram.programId,
      program_name: primaryProgram.programName,
    };
  }

  // Unknown program interaction
  return {
    type: 'unknown',
    program_id: primaryProgram.programId,
    program_name: primaryProgram.programName,
  };
}

/**
 * Find the primary program in a transaction
 */
function findPrimaryProgram(
  instructions: RawTransaction['instructions']
): { programId: string; programName: string } | null {
  // Priority order: Jupiter > Raydium > Kamino > Marinade > others
  const priorityPrograms = [
    JUPITER_V6,
    RAYDIUM_AMM,
    KAMINO,
    MARINADE,
    METAPLEX,
  ];

  for (const instr of instructions) {
    if (priorityPrograms.includes(instr.programId)) {
      return {
        programId: instr.programId,
        programName: PROGRAM_NAMES[instr.programId as keyof typeof PROGRAM_NAMES] || 'Unknown',
      };
    }
  }

  // Return first non-system program
  for (const instr of instructions) {
    if (
      instr.programId !== SYSTEM_PROGRAM &&
      instr.programId !== TOKEN_PROGRAM
    ) {
      return {
        programId: instr.programId,
        programName: PROGRAM_NAMES[instr.programId as keyof typeof PROGRAM_NAMES] || 'Unknown',
      };
    }
  }

  return null;
}

/**
 * Extract token in/out from swap transaction
 */
function extractSwapTokens(tx: RawTransaction): {
  tokenIn?: TokenInfo;
  tokenOut?: TokenInfo;
} {
  const preBalances = tx.meta.preTokenBalances || [];
  const postBalances = tx.meta.postTokenBalances || [];

  let tokenIn: TokenInfo | undefined;
  let tokenOut: TokenInfo | undefined;

  // Compare pre and post balances to find what changed
  const balanceChange = new Map<
    string,
    { pre: number | null; post: number | null; decimals: number }
  >();

  for (const balance of preBalances) {
    const key = balance.mint;
    balanceChange.set(key, {
      pre: balance.uiTokenAmount.uiAmount,
      post: null,
      decimals: balance.uiTokenAmount.decimals,
    });
  }

  for (const balance of postBalances) {
    const key = balance.mint;
    const existing = balanceChange.get(key);
    if (existing) {
      existing.post = balance.uiTokenAmount.uiAmount;
    } else {
      balanceChange.set(key, {
        pre: 0,
        post: balance.uiTokenAmount.uiAmount,
        decimals: balance.uiTokenAmount.decimals,
      });
    }
  }

  // Find tokens that decreased (input) and increased (output)
  Array.from(balanceChange.entries()).forEach(([mint, change]) => {
    const pre = change.pre || 0;
    const post = change.post || 0;
    const delta = post - pre;

    if (delta < -0.000001) {
      // Token decreased - this is input
      tokenIn = {
        mint,
        amount: Math.abs(delta).toString(),
        decimals: change.decimals,
      };
    } else if (delta > 0.000001) {
      // Token increased - this is output
      tokenOut = {
        mint,
        amount: delta.toString(),
        decimals: change.decimals,
      };
    }
  });

  return { tokenIn, tokenOut };
}

/**
 * Detect Kamino action from logs
 */
function detectKaminoAction(logs: string[]): 'deposit' | 'withdraw' | 'stake' | 'claim_rewards' | 'unknown' {
  for (const log of logs) {
    if (log.includes('deposit') || log.includes('mint')) {
      return 'deposit';
    }
    if (log.includes('withdraw') || log.includes('redeem')) {
      return 'withdraw';
    }
    if (log.includes('stake')) {
      return 'stake';
    }
    if (log.includes('reward') || log.includes('claim')) {
      return 'claim_rewards';
    }
  }
  return 'unknown';
}

/**
 * Detect Marinade action from logs and transaction structure
 */
function detectMarinadeAction(
  logs: string[],
  tx: RawTransaction
): 'stake' | 'unstake' | 'claim_rewards' {
  for (const log of logs) {
    if (log.includes('stake') || log.includes('delegate')) {
      if (log.includes('withdraw') || log.includes('unstake')) {
        return 'unstake';
      }
      return 'stake';
    }
    if (log.includes('reward') || log.includes('claim')) {
      return 'claim_rewards';
    }
  }

  // Check rewards array for staking rewards
  if (tx.meta.rewards && tx.meta.rewards.length > 0) {
    for (const reward of tx.meta.rewards) {
      if (reward.rewardType === 'staking') {
        return 'claim_rewards';
      }
    }
  }

  return 'stake'; // Default
}

/**
 * Check if transfer is between own wallets
 */
function isTransferBetweenOwnWallets(tx: RawTransaction): boolean {
  // Check if both source and destination are in known wallets
  const accounts = tx.accounts;

  // Simple heuristic: if transaction only involves 2-3 accounts and no program changes
  if (accounts.length <= 3) {
    const nonSystemAccounts = accounts.filter(
      (a) => a !== SYSTEM_PROGRAM && a !== TOKEN_PROGRAM
    );

    // Check if all accounts are known wallets
    const allKnown = nonSystemAccounts.every((a) =>
      knownWalletAddresses.has(a)
    );

    if (allKnown && nonSystemAccounts.length >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Check for simple SOL transfer
 */
function isSimpleSolTransfer(tx: RawTransaction): boolean {
  const instructions = tx.instructions;

  for (const instr of instructions) {
    if (instr.programId === SYSTEM_PROGRAM) {
      const parsed = instr.parsed as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        const type = (parsed as { type?: string }).type;
        if (type === 'transfer' || type === 'createAccount') {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Detect token mint actions (airdrops, rewards)
 */
function detectTokenMint(tx: RawTransaction): {
  type: 'airdrop' | 'staking_reward';
} | null {
  const preBalances = tx.meta.preTokenBalances || [];
  const postBalances = tx.meta.postTokenBalances || [];

  // Find tokens that appeared without corresponding decrease
  for (const post of postBalances) {
    const pre = preBalances.find((p) => p.mint === post.mint);

    if (!pre && post.uiTokenAmount.uiAmount && post.uiTokenAmount.uiAmount > 0) {
      // Token appeared from nowhere - likely airdrop or reward

      // Check if it's a staking reward (SOL or liquid staking token)
      const stakingTokens = [
        COMMON_TOKENS.SOL,
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
        '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // stSOL
        'uNrix3Q5g51MCEUrYBUEBDdQ96RQDQspQJJnnQ4T3Vc', // jitoSOL
      ];

      if (stakingTokens.includes(post.mint)) {
        return { type: 'staking_reward' };
      }

      return { type: 'airdrop' };
    }
  }

  return null;
}

/**
 * Detect NFT transaction actions
 */
function detectNFTAction(tx: RawTransaction): {
  type: 'nft_purchase' | 'nft_sale';
} | null {
  const logs = tx.meta.logMessages || [];

  // Check for NFT marketplace indicators
  for (const log of logs) {
    if (log.includes('Magic Eden') || log.includes('Tensor')) {
      // Determine if buy or sell based on SOL flow
      const preBalances = tx.meta.preBalances || [];
      const postBalances = tx.meta.postBalances || [];

      // If main account SOL decreased, it's a purchase
      if (preBalances.length > 0 && postBalances.length > 0) {
        if (postBalances[0] < preBalances[0]) {
          return { type: 'nft_purchase' };
        }
        return { type: 'nft_sale' };
      }
    }
  }

  // Check for Metaplex metadata interactions
  const instructions = tx.instructions;
  for (const instr of instructions) {
    if (instr.programId === METAPLEX) {
      return { type: 'nft_purchase' }; // Default to purchase
    }
  }

  return null;
}

/**
 * Check for wrap/unwrap SOL
 */
function isWrapUnwrap(tx: RawTransaction): boolean {
  const logs = tx.meta.logMessages || [];

  for (const log of logs) {
    if (log.includes('wrap') || log.includes('unwrap')) {
      return true;
    }
  }

  // Check for WSOL interactions
  const preBalances = tx.meta.preTokenBalances || [];
  const postBalances = tx.meta.postTokenBalances || [];

  for (const balance of [...preBalances, ...postBalances]) {
    if (balance.mint === COMMON_TOKENS.WSOL) {
      return true;
    }
  }

  return false;
}

function isWrap(tx: RawTransaction): boolean {
  const preTokenBalances = tx.meta.preTokenBalances || [];
  const postTokenBalances = tx.meta.postTokenBalances || [];

  // If SOL balance decreased and WSOL appeared/increased, it's a wrap
  const solPreBalance = preTokenBalances.find((b) => b.mint === COMMON_TOKENS.SOL);
  const wsolPostBalance = postTokenBalances.find((b) => b.mint === COMMON_TOKENS.WSOL);

  if (solPreBalance && wsolPostBalance) {
    return true;
  }

  return false;
}

/**
 * Detect spam transactions
 */
function isSpam(tx: RawTransaction): boolean {
  const logs = tx.meta.logMessages || [];

  for (const log of logs) {
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(log)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parse multiple transactions
 */
export function parseTransactions(transactions: RawTransaction[]): ParsedTransaction[] {
  return transactions.map((tx) => parseTransaction(tx));
}
