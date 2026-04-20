// SolTax AU - API: Get Wallet Balance and Info
import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 150; // ms between requests to avoid 429

async function rateLimitedRequest(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

// Create connection with confirmed commitment for real-time data
function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Get SOL balance for a wallet address
 */
async function getSolBalance(connection: Connection, address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey, 'confirmed');
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error(`Failed to get balance for ${address}:`, error);
    return 0;
  }
}

/**
 * Get approximate transaction count for a wallet
 * Fetches signatures in batches to estimate total count
 * Limited to 100 for performance - enough to show activity level
 */
async function getTransactionCount(
  connection: Connection,
  address: string,
  maxCount: number = 100
): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    let total = 0;
    let beforeSignature: string | undefined;
    let retries = 0;
    const MAX_RETRIES = 3;

    while (total < maxCount && retries < MAX_RETRIES) {
      try {
        await rateLimitedRequest();
        const signatures = await connection.getSignaturesForAddress(publicKey, {
          limit: Math.min(maxCount - total, 1000),
          before: beforeSignature,
        });

        if (signatures.length === 0) break;

        total += signatures.length;
        beforeSignature = signatures[signatures.length - 1].signature;

        // If we got fewer than requested, we've reached the end
        if (signatures.length < 1000) break;
      } catch (err: any) {
        if (err?.message?.includes('429')) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
        } else {
          throw err;
        }
      }
    }

    return total;
  } catch (error) {
    console.error(`Failed to get transaction count for ${address}:`, error);
    return 0;
  }
}

/**
 * Get recent transactions for quick preview
 */
async function getRecentTransactions(
  connection: Connection,
  address: string,
  limit: number = 5
): Promise<Array<{ signature: string; slot: number; blockTime: number | null; err: any }>> {
  try {
    const publicKey = new PublicKey(address);
    await rateLimitedRequest();
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit,
    });

    return signatures.map(sig => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime ?? null,
      err: sig.err,
    }));
  } catch (error) {
    console.error(`Failed to get recent transactions for ${address}:`, error);
    return [];
  }
}

/**
 * Validate if an address is a valid Solana public key
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, includeRecentTx = false } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    // Validate address
    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
        { status: 400 }
      );
    }

    // Create connection
    const connection = getConnection();

    // Fetch balance and transaction info in parallel
    const [balanceSol, recentSigs, transactionCount] = await Promise.all([
      getSolBalance(connection, walletAddress),
      includeRecentTx ? getRecentTransactions(connection, walletAddress) : Promise.resolve([]),
      getTransactionCount(connection, walletAddress),
    ]);

    const hasTransactions = transactionCount > 0;

    return NextResponse.json({
      success: true,
      data: {
        address: walletAddress,
        balanceSol,
        balanceLamports: Math.floor(balanceSol * LAMPORTS_PER_SOL),
        hasTransactions,
        transactionCount,
        recentTransactionCount: recentSigs.length,
        recentTransactions: recentSigs,
        fetchedAt: new Date().toISOString(),
        source: 'solana-mainnet',
      },
    });
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch wallet data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET with query params
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('address');
  const includeRecentTx = searchParams.get('includeRecentTx') === 'true';

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'address query parameter is required' },
      { status: 400 }
    );
  }

  // Reuse POST logic
  const mockRequest = new NextRequest(request.nextUrl, {
    method: 'POST',
    body: JSON.stringify({ walletAddress, includeRecentTx }),
  });

  return POST(mockRequest);
}
