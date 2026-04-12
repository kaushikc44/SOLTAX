// SolTax AU - Solana RPC Connection
import { Connection, clusterApiUrl } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');

// Commitment level for RPC calls
const COMMITMENT = 'confirmed' as const;

// Rate limiting configuration
const RATE_LIMIT_REQUESTS = 100; // requests per second
const RATE_LIMIT_INTERVAL = 1000; // ms

// Request queue for rate limiting
let requestQueue: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  // Remove requests older than 1 second
  requestQueue = requestQueue.filter(time => now - time < RATE_LIMIT_INTERVAL);

  if (requestQueue.length >= RATE_LIMIT_REQUESTS) {
    const waitTime = RATE_LIMIT_INTERVAL - (now - requestQueue[0]);
    if (waitTime > 0) {
      console.warn(`Rate limit reached, waiting ${waitTime}ms`);
    }
  }

  requestQueue.push(now);
}

// Create connection with rate limiting
export function createConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, {
    commitment: COMMITMENT,
    confirmTransactionInitialTimeout: 60000,
  });
}

// Get connection with rate limit check
export async function getConnection(): Promise<Connection> {
  checkRateLimit();
  return createConnection();
}

// Batch connection for multiple requests
export class BatchConnection {
  private connection: Connection;
  private requests: Promise<unknown>[] = [];

  constructor() {
    this.connection = createConnection();
  }

  addRequest<T>(request: Promise<T>): void {
    this.requests.push(request);
  }

  async execute<T>(): Promise<T[]> {
    const results = await Promise.allSettled(this.requests);
    this.requests = [];
    return results
      .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
      .map(r => r.value);
  }
}

// Helper to get slot with error handling
export async function getSlotWithRetry(
  connection: Connection,
  maxRetries = 3
): Promise<number> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await connection.getSlot();
    } catch (error) {
      lastError = error as Error;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
    }
  }

  throw lastError || new Error('Failed to get slot');
}

// Helper to get transaction with error handling
export async function getTransactionWithRetry(
  connection: Connection,
  signature: string,
  maxRetries = 3
): Promise<Awaited<ReturnType<typeof connection.getTransaction>>> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: COMMITMENT,
      });

      if (tx) {
        return tx;
      }

      // Transaction not found yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    } catch (error) {
      lastError = error as Error;
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
    }
  }

  throw lastError || new Error(`Failed to get transaction ${signature}`);
}

export { COMMITMENT };
