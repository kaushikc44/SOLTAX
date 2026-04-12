// SolTax AU - Price Fetcher for AUD Valuations
// Uses CoinGecko API for historical and current token prices

import { COMMON_TOKENS } from '@/types/solana';

// Price cache to avoid duplicate API calls
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// CoinGecko API endpoints
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const COINGECKO_SIMPLE_PRICE = `${COINGECKO_BASE}/simple/token_price/solana`;
const COINGECKO_MARKET_CHART = `${COINGECKO_BASE}/coins/solana/market_chart/range`;
const COINGECKO_COIN_PRICE = `${COINGECKO_BASE}/simple/price`;

// Token to CoinGecko ID mapping
const TOKEN_TO_COINGECKO_ID: Record<string, string> = {
  [COMMON_TOKENS.SOL]: 'solana',
  [COMMON_TOKENS.USDC]: 'usd-coin',
  [COMMON_TOKENS.USDT]: 'tether',
  [COMMON_TOKENS.BONK]: 'bonk',
  [COMMON_TOKENS.JUP]: 'jupiter-exchange-solana',
  [COMMON_TOKENS.RAY]: 'raydium',
  [COMMON_TOKENS.ORCA]: 'orca',
  [COMMON_TOKENS.MNGO]: 'mango-markets',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'msol',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'lido-staked-sol',
  'uNrix3Q5g51MCEUrYBUEBDdQ96RQDQspQJJnnQ4T3Vc': 'jito-staked-sol',
};

export interface PriceResult {
  priceAUD: number;
  source: 'coingecko' | 'cache' | 'manual';
  timestamp: Date;
  confidence: 'high' | 'low';
}

/**
 * Fetch historical price for a token at a specific date
 * Returns AUD price
 */
export async function fetchHistoricalPrice(
  mint: string,
  date: Date
): Promise<PriceResult> {
  // Check cache first
  const cacheKey = `${mint}-${date.toISOString().split('T')[0]}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Handle SOL specially - use coin ID instead of contract address
    const coingeckoId = TOKEN_TO_COINGECKO_ID[mint];
    const isNativeToken = !mint || mint === COMMON_TOKENS.SOL;

    if (isNativeToken || coingeckoId) {
      const price = await fetchHistoricalPriceByRange(
        isNativeToken ? 'solana' : coingeckoId,
        date,
        mint
      );

      if (price > 0) {
        const result: PriceResult = {
          priceAUD: price,
          source: 'coingecko',
          timestamp: new Date(),
          confidence: 'high',
        };
        setCachePrice(cacheKey, price);
        return result;
      }
    }

    // Try contract address lookup for unknown tokens
    if (!isNativeToken && !coingeckoId) {
      const price = await fetchPriceByContractAddress(mint);

      if (price > 0) {
        const result: PriceResult = {
          priceAUD: price,
          source: 'coingecko',
          timestamp: new Date(),
          confidence: 'high',
        };
        setCachePrice(cacheKey, price);
        return result;
      }
    }

    // Price not found
    return {
      priceAUD: 0,
      source: 'manual',
      timestamp: new Date(),
      confidence: 'low',
    };
  } catch (error) {
    console.error(`Failed to fetch price for ${mint}:`, error);
    return {
      priceAUD: 0,
      source: 'manual',
      timestamp: new Date(),
      confidence: 'low',
    };
  }
}

/**
 * Fetch historical price using market chart range endpoint
 */
async function fetchHistoricalPriceByRange(
  coingeckoId: string,
  date: Date,
  mint?: string
): Promise<number> {
  const fromTimestamp = Math.floor(date.getTime() / 1000);
  const toTimestamp = fromTimestamp + 86400; // +24 hours

  try {
    const url = `${COINGECKO_MARKET_CHART}?vs_currency=aud&from=${fromTimestamp}&to=${toTimestamp}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      // Rate limit hit - return 0
      if (response.status === 429) {
        console.warn('CoinGecko rate limit hit');
        return 0;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices as [number, number][];

    if (!prices || prices.length === 0) {
      return 0;
    }

    // Find the price closest to our target date
    const targetTime = date.getTime();
    let closestPrice = prices[0][1];
    let minDiff = Infinity;

    for (const [timestamp, price] of prices) {
      const diff = Math.abs(timestamp - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestPrice = price;
      }
    }

    return closestPrice;
  } catch (error) {
    console.error(`Failed to fetch historical price for ${coingeckoId}:`, error);
    return 0;
  }
}

/**
 * Fetch current price by contract address
 */
async function fetchPriceByContractAddress(
  contractAddress: string
): Promise<number> {
  try {
    const url = `${COINGECKO_SIMPLE_PRICE}?contract_addresses=${contractAddress}&vs_currencies=aud&include_last_updated_at=true`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('CoinGecko rate limit hit');
        return 0;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tokenData = data[contractAddress.toLowerCase()];

    if (!tokenData || !tokenData.aud) {
      return 0;
    }

    return tokenData.aud;
  } catch (error) {
    console.error(
      `Failed to fetch price for contract ${contractAddress}:`,
      error
    );
    return 0;
  }
}

/**
 * Fetch current price for a token (not historical)
 */
export async function fetchCurrentPrice(mint: string): Promise<PriceResult> {
  return fetchHistoricalPrice(mint, new Date());
}

/**
 * Fetch prices for multiple tokens in a single request
 */
export async function fetchMultiplePrices(
  mints: string[]
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  // Group tokens by whether they have CoinGecko IDs
  const knownTokens: string[] = [];
  const unknownTokens: string[] = [];

  for (const mint of mints) {
    if (TOKEN_TO_COINGECKO_ID[mint]) {
      knownTokens.push(mint);
    } else {
      unknownTokens.push(mint);
    }
  }

  // Fetch known tokens using simple price endpoint
  if (knownTokens.length > 0) {
    const coingeckoIds = knownTokens
      .map((m) => TOKEN_TO_COINGECKO_ID[m])
      .join(',');

    try {
      const url = `${COINGECKO_COIN_PRICE}?ids=${coingeckoIds}&vs_currencies=aud`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        for (const mint of knownTokens) {
          const coingeckoId = TOKEN_TO_COINGECKO_ID[mint];
          const tokenData = data[coingeckoId];

          if (tokenData && tokenData.aud) {
            results.set(mint, {
              priceAUD: tokenData.aud,
              source: 'coingecko',
              timestamp: new Date(),
              confidence: 'high',
            });
          } else {
            results.set(mint, {
              priceAUD: 0,
              source: 'manual',
              timestamp: new Date(),
              confidence: 'low',
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch multiple prices:', error);
    }
  }

  // Fetch unknown tokens individually (contract addresses)
  for (const mint of unknownTokens) {
    const price = await fetchPriceByContractAddress(mint);

    results.set(mint, {
      priceAUD: price,
      source: price > 0 ? 'coingecko' : 'manual',
      timestamp: new Date(),
      confidence: price > 0 ? 'high' : 'low',
    });
  }

  return results;
}

/**
 * Get cached price if available and not expired
 */
function getCachedPrice(cacheKey: string): PriceResult | null {
  const cached = priceCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  // Check if cache is still valid
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL_MS) {
    priceCache.delete(cacheKey);
    return null;
  }

  return {
    priceAUD: cached.price,
    source: 'cache',
    timestamp: new Date(cached.timestamp),
    confidence: 'high',
  };
}

/**
 * Set price in cache
 */
function setCachePrice(cacheKey: string, price: number): void {
  priceCache.set(cacheKey, {
    price,
    timestamp: Date.now(),
  });

  // Clean up old entries periodically
  if (priceCache.size > 1000) {
    const now = Date.now();
    Array.from(priceCache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_TTL_MS) {
        priceCache.delete(key);
      }
    });
  }
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Format AUD amount for display
 */
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

/**
 * Calculate total portfolio value in AUD
 */
export async function calculatePortfolioValueAUD(
  balances: Array<{ mint: string; amount: number; decimals: number }>
): Promise<{ totalAUD: number; breakdown: Map<string, number> }> {
  const mints = balances.map((b) => b.mint);
  const prices = await fetchMultiplePrices(mints);

  let totalAUD = 0;
  const breakdown = new Map<string, number>();

  for (const balance of balances) {
    const priceResult = prices.get(balance.mint);
    const priceAUD = priceResult?.priceAUD || 0;

    // Convert from token units to actual amount
    const actualAmount = balance.amount / Math.pow(10, balance.decimals);
    const valueAUD = actualAmount * priceAUD;

    totalAUD += valueAUD;
    breakdown.set(balance.mint, valueAUD);
  }

  return { totalAUD, breakdown };
}
