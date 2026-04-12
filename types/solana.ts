// SolTax AU - Solana-Specific Types

// Program IDs for known Solana programs
export const PROGRAM_IDS = {
  // DEX Aggregators
  JUPITER: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',

  // DEXs
  RAYDIUM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  ORCA: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  SERUM: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',

  // Lending
  MARGINFI: 'marBjsL87Ug8NYiptSnUdLfqfH8Vhu5F7De7vP5WnqV',
  SOLEND: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',

  // Staking
  MARINADE: 'MarBmsSXTKGS8kVHd7qzpny2qHMg7vrtUuFxNTFdm9b',
  JITO: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',

  // NFT Marketplaces
  MAGIC_EDEN: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
  TENSOR: 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',

  // System Program
  SYSTEM: '11111111111111111111111111111111',
  TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
} as const;

export type ProgramName =
  | 'Jupiter'
  | 'Raydium'
  | 'Orca'
  | 'Serum'
  | 'Marginfi'
  | 'Solend'
  | 'Marinade'
  | 'Jito'
  | 'Magic Eden'
  | 'Tensor'
  | 'System'
  | 'Token Program'
  | 'Associated Token'
  | 'Unknown';

export const PROGRAM_NAMES: Record<string, ProgramName> = {
  [PROGRAM_IDS.JUPITER]: 'Jupiter',
  [PROGRAM_IDS.RAYDIUM]: 'Raydium',
  [PROGRAM_IDS.ORCA]: 'Orca',
  [PROGRAM_IDS.SERUM]: 'Serum',
  [PROGRAM_IDS.MARGINFI]: 'Marginfi',
  [PROGRAM_IDS.SOLEND]: 'Solend',
  [PROGRAM_IDS.MARINADE]: 'Marinade',
  [PROGRAM_IDS.JITO]: 'Jito',
  [PROGRAM_IDS.MAGIC_EDEN]: 'Magic Eden',
  [PROGRAM_IDS.TENSOR]: 'Tensor',
  [PROGRAM_IDS.SYSTEM]: 'System',
  [PROGRAM_IDS.TOKEN]: 'Token Program',
  [PROGRAM_IDS.ASSOCIATED_TOKEN]: 'Associated Token',
};

// Common token mints
export const COMMON_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  WSOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  MNGO: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
} as const;

export type TokenSymbol =
  | 'SOL'
  | 'WSOL'
  | 'USDC'
  | 'USDT'
  | 'BONK'
  | 'JUP'
  | 'RAY'
  | 'ORCA'
  | 'MNGO';

export const TOKEN_SYMBOLS: Record<string, TokenSymbol> = {
  [COMMON_TOKENS.SOL]: 'SOL',
  [COMMON_TOKENS.WSOL]: 'WSOL',
  [COMMON_TOKENS.USDC]: 'USDC',
  [COMMON_TOKENS.USDT]: 'USDT',
  [COMMON_TOKENS.BONK]: 'BONK',
  [COMMON_TOKENS.JUP]: 'JUP',
  [COMMON_TOKENS.RAY]: 'RAY',
  [COMMON_TOKENS.ORCA]: 'ORCA',
  [COMMON_TOKENS.MNGO]: 'MNGO',
};

// Instruction types for parsing
export type InstructionType =
  | 'transfer'
  | 'transferChecked'
  | 'mintTo'
  | 'burn'
  | 'closeAccount'
  | 'syncNative'
  | 'initializeAccount'
  | 'createAccount'
  | 'swap'
  | 'swapExactIn'
  | 'swapExactOut'
  | 'stake'
  | 'unstake'
  | 'withdraw'
  | 'deposit'
  | 'claim';

// Parsed instruction interface
export interface ParsedInstruction {
  type: InstructionType;
  programId: string;
  programName?: ProgramName;
  info: {
    source?: string;
    destination?: string;
    amount?: string;
    decimals?: number;
    mint?: string;
    authority?: string;
    [key: string]: unknown;
  };
}

// Transaction parsing result
export interface TransactionParseResult {
  signature: string;
  blockTime: Date;
  slot: number;
  type: 'transfer' | 'swap' | 'stake' | 'unstake' | 'reward' | 'nft' | 'unknown';
  programName?: ProgramName;
  transfers: TokenTransfer[];
  fee: number; // in lamports
  error?: string;
}

export interface TokenTransfer {
  mint: string;
  from: string;
  to: string;
  amount: string; // raw amount
  decimals: number;
  uiAmount: number;
}

// Helper to convert lamports to SOL
export const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}
