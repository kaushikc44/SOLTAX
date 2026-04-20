// SolTax AU - Solana Transaction Fetcher
// Fetches all transactions for a wallet address with pagination and caching
import { Connection, PublicKey, type VersionedTransactionResponse } from '@solana/web3.js';
import { createClient } from '@/lib/supabase/client';

export interface RawTransaction {
  signature: string;
  block_time: number; // Unix timestamp
  fee: number; // in lamports
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

export interface FetchOptions {
  limit?: number;
  beforeSignature?: string;
  untilSignature?: string;
  cacheEnabled?: boolean;
}

export interface FetchResult {
  transactions: RawTransaction[];
  hasMore: boolean;
  nextBeforeSignature?: string;
  totalFetched: number;
}

// Solana RPC connection with multiple endpoints for rate limit handling
let cachedConnection: Connection | null = null;

// Public RPC endpoints (in priority order)
const RPC_ENDPOINTS = [
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo', // Demo endpoint
  'https://rpc.mainnet-beta.solana.com', // Fallback
];

let currentEndpointIndex = 0;

export function getConnection(): Connection {
  if (!cachedConnection) {
    const rpcUrl = RPC_ENDPOINTS[currentEndpointIndex];
    cachedConnection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return cachedConnection;
}

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // ms between requests

export async function rateLimitedRequest(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch all transaction signatures for a wallet address
 * Paginates through all available signatures
 */
export async function fetchAllSignatures(
  walletAddress: string,
  options: { limit?: number; beforeSignature?: string } = {}
): Promise<{ signatures: string[]; hasMore: boolean }> {
  const connection = getConnection();
  const publicKey = new PublicKey(walletAddress);
  const { limit = 1000, beforeSignature } = options;

  const allSignatures: string[] = [];
  let currentBeforeSignature = beforeSignature;
  let hasMore = true;

  let retryCount = 0;
  const MAX_RETRIES = 3;

  while (hasMore && retryCount < MAX_RETRIES) {
    try {
      await rateLimitedRequest();
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: Math.min(limit, 1000),
        before: currentBeforeSignature,
      });

      if (signatures.length === 0) {
        hasMore = false;
        break;
      }

      for (const sig of signatures) {
        allSignatures.push(sig.signature);
      }

      // Check if we got fewer than requested - means we've reached the end
      if (signatures.length < Math.min(limit, 1000)) {
        hasMore = false;
      } else {
        currentBeforeSignature = signatures[signatures.length - 1].signature;
      }

      // Rate limiting - wait between requests
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
        retryCount++;
        console.warn(`Rate limited while fetching signatures, retry ${retryCount}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, 3000 * retryCount)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }

  return { signatures: allSignatures, hasMore };
}

/**
 * Convert VersionedTransactionResponse to our RawTransaction format
 * Handles both legacy and versioned transactions with Address Lookup Tables
 */
function convertTransaction(tx: any): RawTransaction {
  // Get all account keys - handle both resolved and unresolved ALTs
  let allAccounts: string[] = [];

  try {
    // Try to get account keys (works if ALTs are resolved)
    const accountKeys = tx.transaction.message.getAccountKeys();
    allAccounts = accountKeys.keySegments().flat().map((key: any) => key.toString());
  } catch (altError: any) {
    // ALTs not resolved - use static accounts only
    // This is a fallback for versioned transactions
    const message = tx.transaction.message;
    allAccounts = message.accountKeys?.map((k: any) => k.pubkey || k.toString()) || [];

    // Try to get address table lookups and resolve them
    if (message.addressTableLookups && message.addressTableLookups.length > 0) {
      console.warn('Transaction uses Address Lookup Tables - some account data may be incomplete');
      // For now, we'll work with static accounts
      // A full fix would require fetching the lookup tables
    }
  }

  // Convert compiled instructions
  const instructions = tx.transaction.message.compiledInstructions.map((instr: any) => {
    const programId = allAccounts[instr.programIdIndex] || '';
    const accounts = instr.accountKeyIndexes?.map((idx: number) => allAccounts[idx]);

    return {
      programId,
      accounts,
      data: instr.data ? Buffer.from(instr.data).toString('base64') : undefined,
      parsed: undefined,
    };
  });

  // Convert inner instructions
  const innerInstructions = tx.meta?.innerInstructions?.map((inner: any) => ({
    index: inner.index,
    instructions: inner.instructions.map((instr: any) => {
      const programId = allAccounts[instr.programIdIndex] || '';
      const accounts = instr.accountKeyIndexes?.map((idx: number) => allAccounts[idx]);

      return {
        programId,
        accounts,
        data: instr.data ? Buffer.from(instr.data).toString('base64') : undefined,
        parsed: undefined,
      };
    }),
  }));

  return {
    signature: tx.signature,
    block_time: tx.blockTime || Math.floor(Date.now() / 1000),
    fee: tx.meta?.fee || 0,
    accounts: allAccounts,
    instructions,
    meta: {
      err: tx.meta?.err || null,
      fee: tx.meta?.fee || 0,
      innerInstructions,
      logMessages: tx.meta?.logMessages || [],
      postBalances: tx.meta?.postBalances || [],
      preBalances: tx.meta?.preBalances || [],
      postTokenBalances: tx.meta?.postTokenBalances || [],
      preTokenBalances: tx.meta?.preTokenBalances || [],
      rewards: tx.meta?.rewards,
    },
  };
}

/**
 * Fetch full transaction details for a signature
 */
export async function fetchTransaction(
  signature: string
): Promise<RawTransaction | null> {
  await rateLimitedRequest();
  const connection = getConnection();

  try {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return null;
    }

    return convertTransaction(tx);
  } catch (error: any) {
    // Handle rate limit errors
    if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
      console.warn(`Rate limited for transaction ${signature}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return fetchTransaction(signature); // Retry
    }
    console.error(`Failed to fetch transaction ${signature}:`, error);
    return null;
  }
}

/**
 * Check if transaction is already cached in Supabase
 */
export async function isTransactionCached(
  walletId: string,
  signature: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('signature')
      .eq('wallet_id', walletId)
      .eq('signature', signature)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Cache transactions in Supabase
 */
export async function cacheTransactions(
  walletId: string,
  transactions: Array<{
    signature: string;
    block_time: string;
    tx_type: string;
    token_in_mint?: string | null;
    token_in_amount?: string | null;
    token_out_mint?: string | null;
    token_out_amount?: string | null;
    fee_sol?: string | null;
    raw_data: unknown;
    ato_classification?: unknown;
    is_spam?: boolean;
  }>
): Promise<void> {
  try {
    const supabase = createClient();

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);

      const { error } = await supabase
        .from('transactions')
        .insert(batch as any);

      if (error) {
        console.error('Failed to cache transactions:', error);
      }

      // Rate limiting
      if (i + batchSize < transactions.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  } catch (error) {
    console.error('Failed to cache transactions:', error);
  }
}

/**
 * Fetch all transactions for a wallet address
 * Includes pagination and optional Supabase caching
 */
export async function fetchWalletTransactions(
  walletAddress: string,
  walletId: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const {
    limit = 1000,
    beforeSignature,
    untilSignature,
    cacheEnabled = true,
  } = options;

  // Fetch all signatures
  const { signatures: allSignatures } = await fetchAllSignatures(walletAddress, {
    limit,
    beforeSignature,
  });

  // Filter by untilSignature if provided
  let signaturesToFetch = allSignatures;
  if (untilSignature) {
    const untilIndex = allSignatures.indexOf(untilSignature);
    if (untilIndex !== -1) {
      signaturesToFetch = allSignatures.slice(0, untilIndex);
    }
  }

  // Check which signatures are not cached
  const uncachedSignatures: string[] = [];
  const cachedSignatures: string[] = [];

  if (cacheEnabled) {
    for (const sig of signaturesToFetch) {
      const isCached = await isTransactionCached(walletId, sig);
      if (isCached) {
        cachedSignatures.push(sig);
      } else {
        uncachedSignatures.push(sig);
      }
    }
  } else {
    uncachedSignatures.push(...signaturesToFetch);
  }

  // Fetch uncached transactions
  const newTransactions: RawTransaction[] = [];

  // Fetch in parallel with rate limiting
  const batchSize = 10;
  for (let i = 0; i < uncachedSignatures.length; i += batchSize) {
    const batch = uncachedSignatures.slice(i, i + batchSize);

    const results = await Promise.all(batch.map((sig) => fetchTransaction(sig)));

    for (const tx of results) {
      if (tx) {
        newTransactions.push(tx);
      }
    }

    // Rate limiting
    if (i + batchSize < uncachedSignatures.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Cache new transactions in Supabase
  if (cacheEnabled && newTransactions.length > 0) {
    await cacheTransactions(
      walletId,
      newTransactions.map((tx) => ({
        signature: tx.signature,
        block_time: new Date(tx.block_time * 1000).toISOString(),
        tx_type: 'unknown',
        fee_sol: (tx.fee / 1_000_000_000).toString(),
        raw_data: tx,
        is_spam: false,
      }))
    );
  }

  return {
    transactions: newTransactions,
    hasMore: signaturesToFetch.length >= limit,
    nextBeforeSignature:
      signaturesToFetch.length > 0
        ? signaturesToFetch[signaturesToFetch.length - 1]
        : undefined,
    totalFetched: newTransactions.length,
  };
}

/**
 * Fetch transactions without caching (for demo/testing)
 */
export async function fetchTransactionsNoCache(
  walletAddress: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const { limit = 100, beforeSignature } = options;

  const connection = getConnection();
  const publicKey = new PublicKey(walletAddress);

  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit,
    before: beforeSignature,
  });

  if (signatures.length === 0) {
    return { transactions: [], hasMore: false, totalFetched: 0 };
  }

  const transactions: RawTransaction[] = [];

  // Fetch in parallel
  const batchSize = 10;
  for (let i = 0; i < signatures.length; i += batchSize) {
    const batch = signatures.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map((sig) => fetchTransaction(sig.signature))
    );

    for (const tx of results) {
      if (tx) {
        transactions.push(tx);
      }
    }

    // Rate limiting
    if (i + batchSize < signatures.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    transactions,
    hasMore: signatures.length >= limit,
    nextBeforeSignature: signatures[signatures.length - 1]?.signature,
    totalFetched: transactions.length,
  };
}
