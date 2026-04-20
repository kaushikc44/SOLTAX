// SolTax AU - Helius API Integration
// Uses Helius enhanced APIs for better transaction parsing
// Supports: Kamino, Meteora, Drift, Jupiter, Orca, Raydium, Marinade, Jito

const HELIUS_API_KEY = '3c1b322c-ed6d-4504-ab05-975b38f71ac5';
const HELIUS_BASE_URL = 'https://api.helius.xyz';

// Protocol program IDs for detection
export const PROTOCOL_PROGRAMS: Record<string, string[]> = {
  // Kamino Finance (lending, liquidity, staking)
  'KAMINO': [
    'KLend2g3cP87fffoy8qdmvCRxXsgK7qTQD9h11U', // Kamino Lending
    'KAMMNDRjF9DnfsqCpR2qjFfzCLhKDRt8wKvHx', // Kamino Lending Manager
    'kLix5fWj9zhfe11D4mNMvPsB82ax8ZSzYD3nKpJ', // Kamino Liquidity
    'kLix5fWj9zhfe11D4mNMvPsB82ax8ZSzYD3nKpJxz', // Kamino Liquidity Manager
  ],
  // Meteora (DLMM pools, liquidity)
  'METEORA': [
    'LBUZKhxPFwN41TZLZ3ksGZAhs7WEuA98LWqJTy8zR', // Meteora DLMM
    'Eo7WjKq67rjJQSZxS6z3YkapzY7eMz65hX6ztqSzvrp', // Meteora AMM
    'MERoPQn8VhYfKQj6H6Z8bRfXz8wKj9VqN5cLx2', // Meteora Oracle
  ],
  // Drift Protocol (perpetuals, spot trading)
  'DRIFT': [
    'dRiFpD7kR2xF7qMzK4j8Xh6VqN5cLx2wKj9VqN5c', // Drift Program
    'dRiFpD7kR2xF7qMzK4j8Xh6VqN5cLx2wKj9VqN5cLx', // Drift V2
  ],
  // Jupiter (aggregator)
  'JUPITER': [
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter V6
    'JUP4Fb28qiAUJKBGXwT5vR9dLLn844tQexUy6p3', // Jupiter V5
    'JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo', // Jupiter V6 Router
  ],
  // Orca (whirlpools)
  'ORCA': [
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
    'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1', // Orca AMM
  ],
  // Raydium
  'RAYDIUM': [
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM V5
    'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CLMM
    'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C', // Raydium CPMM
  ],
  // Marinade Finance
  'MARINADE': [
    'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aDn', // Marinade Staking
    '8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC', // Marinade Unstake
  ],
  // Jito
  'JITO': [
    'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // Jito Staking
    'DfXygSm4jCyNCybVYYK6DwzWfGGKj5KcMjiME4kSjGu2', // Jito Unstake
  ],
};

export interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  description?: string;
  tokenTransfers?: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount?: string;
    toUserAccount?: string;
    tokenAmount: number;
    mint: string;
    decimals: number;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges?: Array<{
      tokenAccount: string;
      mint: string;
      rawTokenAmount: number;
      tokenStandard: string;
    }>;
  }>;
}

export interface HeliusResponse {
  result: HeliusTransaction[];
}

/**
 * Fetch transactions using Helius enhanced REST API
 */
export async function fetchTransactions(
  walletAddress: string,
  limit: number = 50
): Promise<HeliusTransaction[]> {
  const url = `${HELIUS_BASE_URL}/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`;

  try {
    const response = await fetch(url);
    const data: HeliusTransaction[] = await response.json();
    return data || [];
  } catch (error) {
    console.error('Helius API error:', error);
    return [];
  }
}

/**
 * Get wallet balance using Helius
 */
export async function getBalance(walletAddress: string): Promise<number> {
  const url = `${HELIUS_BASE_URL}/`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [walletAddress],
    }),
  });

  const data = await response.json();
  return data.result?.value || 0;
}

/**
 * Detect protocol from transaction source (Helius provides this)
 */
export function detectProtocol(tx: HeliusTransaction): string | null {
  // Use Helius source field directly - it's already uppercase
  const source = tx.source || '';

  // Map Helius sources to our protocol names
  const sourceMap: Record<string, string> = {
    'JUPITER': 'JUPITER',
    'ORCA': 'ORCA',
    'RAYDIUM': 'RAYDIUM',
    'MARINADE': 'MARINADE',
    'JITO': 'JITO',
    'KAMINO': 'KAMINO',
    'METEORA': 'METEORA',
    'DRIFT': 'DRIFT',
    'PHANTOM': 'PHANTOM',
    'SOLANA_PROGRAM_LIBRARY': 'SPL',
    'SYSTEM_PROGRAM': 'SYSTEM',
    'OKX_DEX_ROUTER': 'OKX',
    'MAYAN_SWIFT_BRIDGE': 'MAYAN',
    'CIRCLE_CCTP_TOKEN_V2': 'CIRCLE_CCTP',
    'ASSOCIATED_TOKEN_PROGRAM': 'SPL',
    'BUBBLEGUM': 'METAPLEX',
  };

  if (sourceMap[source]) {
    return sourceMap[source];
  }

  // Check description for protocol hints as fallback
  const desc = tx.description || '';
  if (desc.toUpperCase().includes('KAMINO')) return 'KAMINO';
  if (desc.toUpperCase().includes('METEORA')) return 'METEORA';
  if (desc.toUpperCase().includes('DRIFT')) return 'DRIFT';
  if (desc.toUpperCase().includes('JUPITER')) return 'JUPITER';
  if (desc.toUpperCase().includes('ORCA')) return 'ORCA';
  if (desc.toUpperCase().includes('RAYDIUM')) return 'RAYDIUM';
  if (desc.toUpperCase().includes('MARINADE')) return 'MARINADE';
  if (desc.toUpperCase().includes('JITO')) return 'JITO';

  return null;
}

/**
 * Classify Helius transaction type to ATO type with protocol context
 */
export function classifyHeliusTransaction(heliusType: string, protocol?: string | null): string {
  const typeMap: Record<string, string> = {
    // Swaps
    'SWAP': 'Swap',
    'SWAP_LAYOUT': 'Swap',
    'TOKEN_SWAP': 'Swap',
    'JUPITER_SWAP': 'Swap',
    'JUPITER_SWAP_V3': 'Swap',
    'JUPITER_SWAP_V4': 'Swap',
    'RAYDIUM_SWAP': 'Swap',
    'ORCA_SWAP': 'Swap',
    // Staking
    'STAKE': 'Staking',
    'STAKE_SOL': 'Staking',
    'UNSTAKE': 'Unstaking',
    'CLAIM_REWARDS': 'Staking Rewards',
    'MARINADE_DEPOSIT': 'Staking',
    'MARINADE_WITHDRAW': 'Unstaking',
    'JITO_STAKE': 'Staking',
    'JITO_UNSTAKE': 'Unstaking',
    // Transfers
    'TRANSFER': 'Transfer',
    'TRANSFER_W_SOL': 'Transfer',
    // NFTs
    'NFT_BID': 'NFT',
    'NFT_BID_CANCELLED': 'NFT',
    'NFT_CANCEL_LISTING': 'NFT',
    'NFT_LISTING': 'NFT',
    'NFT_SALE': 'NFT',
    'NFT_MINT': 'NFT',
    'COMPRESSED_NFT_MINT': 'NFT',
    'COMPRESSED_NFT_TRANSFER': 'NFT',
    // Airdrops
    'AIRDROP': 'Airdrop',
    'COMPRESSED_AIRDROP': 'Airdrop',
    // Lending
    'BORROW': 'Lending',
    'LENDING_DEPOSIT': 'Lending',
    'LENDING_WITHDRAW': 'Lending',
    'REPAY': 'Lending',
    // Token actions
    'TOKEN_TRANSFER': 'Transfer',
    'SPL_TRANSFER': 'Transfer',
    // Liquidity
    'DECREASE_LIQUIDITY': 'Liquidity Withdrawal',
    'INCREASE_LIQUIDITY': 'Liquidity Deposit',
    'ADD_LIQUIDITY': 'Liquidity Deposit',
    'REMOVE_LIQUIDITY': 'Liquidity Withdrawal',
    // Deposit/Withdraw actions
    'DEPOSIT': 'Deposit',
    'DEPOSIT_FOR_BURN': 'Deposit',
    'WITHDRAW': 'Withdrawal',
    // Order/Dex actions
    'FULFILL': 'Trade',
    'SETTLE': 'Trade Settlement',
    'INITIALIZE_ACCOUNT': 'Account Setup',
    // Unknown
    'UNKNOWN': 'Unknown',
  };

  // Protocol-specific classifications
  if (protocol) {
    switch (protocol) {
      case 'KAMINO':
        // Kamino lending deposits/withdrawals are CGT events
        if (heliusType?.toUpperCase()?.includes('DEPOSIT')) return 'Lending Deposit';
        if (heliusType?.toUpperCase()?.includes('WITHDRAW')) return 'Lending Withdrawal';
        if (heliusType?.toUpperCase()?.includes('LIQUIDITY')) return 'Liquidity Deposit';
        break;
      case 'METEORA':
        // Meteora DLMM liquidity positions
        if (heliusType?.toUpperCase()?.includes('DLMM')) return 'Liquidity Deposit';
        if (heliusType?.toUpperCase()?.includes('LIQUIDITY')) return 'Liquidity Deposit';
        break;
      case 'DRIFT':
        // Drift perpetual trading
        if (heliusType?.toUpperCase()?.includes('PERP')) return 'Trade';
        if (heliusType?.toUpperCase()?.includes('DEPOSIT')) return 'Lending Deposit';
        if (heliusType?.toUpperCase()?.includes('WITHDRAW')) return 'Lending Withdrawal';
        break;
    }
  }

  // Convert to uppercase for case-insensitive matching
  const upperType = heliusType?.toUpperCase() || '';
  return typeMap[upperType] || heliusType || 'Unknown';
}

/**
 * Extract token transfers with direction (in/out)
 */
function extractTokenTransfers(tx: HeliusTransaction, walletAddress: string): {
  tokenInMint: string | null;
  tokenInAmount: string | null;
  tokenOutMint: string | null;
  tokenOutAmount: string | null;
} {
  let tokenInMint: string | null = null;
  let tokenInAmount: string | null = null;
  let tokenOutMint: string | null = null;
  let tokenOutAmount: string | null = null;

  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    for (const transfer of tx.tokenTransfers) {
      // Determine if token is coming in or going out based on fromUserAccount
      const isOutgoing = transfer.fromUserAccount?.toLowerCase() === walletAddress.toLowerCase();

      if (isOutgoing) {
        // Token going out (disposal)
        if (!tokenOutMint) {
          tokenOutMint = transfer.mint;
          tokenOutAmount = transfer.tokenAmount.toString();
        }
      } else {
        // Token coming in (acquisition)
        if (!tokenInMint) {
          tokenInMint = transfer.mint;
          tokenInAmount = transfer.tokenAmount.toString();
        }
      }
    }
  }

  // Check native transfers for SOL
  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
    for (const transfer of tx.nativeTransfers) {
      const isOutgoing = transfer.fromUserAccount?.toLowerCase() === walletAddress.toLowerCase();

      if (isOutgoing) {
        if (!tokenOutMint) {
          tokenOutMint = 'So11111111111111111111111111111111111111112';
          tokenOutAmount = transfer.amount.toString();
        }
      } else {
        if (!tokenInMint) {
          tokenInMint = 'So11111111111111111111111111111111111111112';
          tokenInAmount = transfer.amount.toString();
        }
      }
    }
  }

  return { tokenInMint, tokenInAmount, tokenOutMint, tokenOutAmount };
}

/**
 * Convert Helius transaction to our format with protocol detection
 */
export function heliusToTransaction(tx: HeliusTransaction, walletAddress?: string): any {
  // Detect protocol from transaction
  const protocol = detectProtocol(tx);

  // Classify transaction type with protocol context
  const atoType = classifyHeliusTransaction(tx.type, protocol);

  // Extract token transfers with direction
  const { tokenInMint, tokenInAmount, tokenOutMint, tokenOutAmount } = walletAddress
    ? extractTokenTransfers(tx, walletAddress)
    : { tokenInMint: null, tokenInAmount: null, tokenOutMint: null, tokenOutAmount: null };

  // Build protocol metadata
  const protocolInfo: Record<string, any> = {};
  if (protocol) {
    protocolInfo.protocol = protocol;
    protocolInfo.source = protocol.toLowerCase();
  }

  return {
    signature: tx.signature,
    block_time: new Date(tx.timestamp * 1000).toISOString(),
    tx_type: atoType,
    token_in_mint: tokenInMint,
    token_in_amount: tokenInAmount,
    token_out_mint: tokenOutMint,
    token_out_amount: tokenOutAmount,
    fee_sol: (tx.fee / 1_000_000_000).toString(),
    raw_data: tx,
    is_spam: false,
    source: protocol?.toLowerCase() || 'helius',
    protocol: protocol,
  };
}
