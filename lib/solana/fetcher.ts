// SolTax AU - Solana Transaction Fetcher
import { Connection, PublicKey } from '@solana/web3.js';
import type { SolanaTransaction } from '@/types';
import { getTransactionWithRetry } from './connection';

export interface FetchOptions {
  limit?: number;
  beforeSignature?: string;
  untilSignature?: string;
}

export interface FetchResult {
  transactions: SolanaTransaction[];
  hasMore: boolean;
  nextBeforeSignature?: string;
}

// Fetch transactions for a wallet address
export async function fetchWalletTransactions(
  connection: Connection,
  walletAddress: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const { limit = 50, beforeSignature, untilSignature } = options;

  const publicKey = new PublicKey(walletAddress);

  // Get confirmed transaction signatures
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit,
    before: beforeSignature,
    until: untilSignature,
  });

  if (signatures.length === 0) {
    return { transactions: [], hasMore: false };
  }

  // Fetch full transaction details
  const transactions: SolanaTransaction[] = [];

  for (const sigInfo of signatures) {
    try {
      const tx = await getTransactionWithRetry(connection, sigInfo.signature);

      if (tx) {
        transactions.push({
          signature: sigInfo.signature,
          blockTime: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
          slot: tx.slot,
          message: {
            accountKeys: tx.transaction.message.accountKeys.map(key => ({
              pubkey: key.pubkey.toString(),
              signer: key.signer,
              source: 'transaction',
              writable: key.writable,
            })),
            instructions: tx.transaction.message.instructions.map(instr => ({
              programId: instr.programId.toString(),
              accounts: 'accounts' in instr && instr.accounts
                ? instr.accounts.map(a => a.toString())
                : undefined,
              data: 'data' in instr && instr.data
                ? instr.data.toString('base64')
                : undefined,
              parsed: 'parsed' in instr ? instr.parsed : undefined,
            })),
            recentBlockhash: tx.transaction.message.recentBlockhash.toString(),
          },
          meta: {
            err: tx.meta?.err,
            fee: tx.meta?.fee || 0,
            innerInstructions: tx.meta?.innerInstructions?.map(inner => ({
              index: inner.index,
              instructions: inner.instructions.map(instr => ({
                programId: instr.programId.toString(),
                accounts: 'accounts' in instr && instr.accounts
                  ? instr.accounts.map(a => a.toString())
                  : undefined,
                data: 'data' in instr && instr.data
                  ? instr.data.toString('base64')
                  : undefined,
                parsed: 'parsed' in instr ? instr.parsed : undefined,
              })),
            })),
            logMessages: tx.meta?.logMessages || [],
            postBalances: tx.meta?.postBalances || [],
            preBalances: tx.meta?.preBalances || [],
            postTokenBalances: tx.meta?.postTokenBalances || [],
            preTokenBalances: tx.meta?.preTokenBalances || [],
            rewards: tx.meta?.rewards,
          },
        });
      }
    } catch (error) {
      console.error(`Failed to fetch transaction ${sigInfo.signature}:`, error);
      // Continue with next transaction
    }
  }

  return {
    transactions,
    hasMore: signatures.length >= limit,
    nextBeforeSignature: signatures[signatures.length - 1]?.signature,
  };
}

// Fetch multiple wallets' transactions in parallel
export async function fetchMultipleWalletsTransactions(
  connection: Connection,
  walletAddresses: string[],
  options: FetchOptions = {}
): Promise<Map<string, FetchResult>> {
  const results = new Map<string, FetchResult>();

  const promises = walletAddresses.map(async (address) => {
    try {
      const result = await fetchWalletTransactions(connection, address, options);
      results.set(address, result);
    } catch (error) {
      console.error(`Failed to fetch transactions for ${address}:`, error);
      results.set(address, { transactions: [], hasMore: false });
    }
  });

  await Promise.all(promises);

  return results;
}

// Check if a signature exists (lightweight check)
export async function signatureExists(
  connection: Connection,
  signature: string
): Promise<boolean> {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    return tx !== null;
  } catch {
    return false;
  }
}

// Get earliest transaction signature for a wallet
export async function getFirstTransactionSignature(
  connection: Connection,
  walletAddress: string
): Promise<string | null> {
  const publicKey = new PublicKey(walletAddress);

  // Get signatures (oldest first by using large limit)
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit: 1000,
  });

  if (signatures.length === 0) {
    return null;
  }

  // Return the last (oldest) signature
  return signatures[signatures.length - 1].signature;
}
