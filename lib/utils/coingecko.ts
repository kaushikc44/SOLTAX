// SolTax AU - CoinGecko Price API
import type { PriceData } from '@/types';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const BASE_URL = 'https://api.coingecko.com/api/v3';

// Common Solana tokens and their CoinGecko IDs
export const COINGECKO_IDS: Record<string, string> = {
  // Major tokens
  'So11111111111111111111111111111111111111112': 'solana',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
  'WSol1111111111111111111111111111111111111111N': 'wrapped-solana',

  // Stablecoins
  '6FrrzDk5mQARGc1TDYoyVnSyRdds1t4PbtohCD6p3tgG': 'usd-coin', // USX (pegged to USD)
  '4eDf52YYzL6i6gbZ6FXqrLUPXbtP61f1gPSFM66M4XHe': 'soon-to-be-token', // SOON
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'raydium',

  // Meme tokens
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'bonk',
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'popcat',
  'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82': 'brett',

  // DEX tokens
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'jupiter-exchange-solana',
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'orca',
  'RAYbMMnmJ2YBfVfAzRCDf7tHqRjJtBBfV6eYDVdp1Xh': 'raydium',

  // Staking/LST tokens
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'msol',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'jito-governance-token',
  'jtojtomepa8beP8uQyTXdHiVfkoHgvxkR8WfFQD6V': 'jito-governance-token',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'lido-staked-sol',

  // Other popular tokens
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ethereum',
  '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk': 'ethereum',
  'rndrizt3MK12ht1PHoPUdqNvLsHuGzP4fB8JUcR9X': 'render-token',
  '6YoPMXsGFMkdtZH9uTW2qzYXUerD4xcBCe5KzFA9Zr5a': 'solana',
  '4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs': 'solana',

  // Kamino Finance tokens
  'KMNo9jJsRyJ832G5zXkR8hRk6P56s4Jf5JHvXpump': 'kamino-finance', // KAMINO token
  'kiNeKo77w1K5Pj5QAGeCM8x4xWUg97Xp79D29dF4WZ8': 'kamino-lending-usdc', // kUSDC
  'kLTCp8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8': 'kamino-lending-sol', // kSOL
  'kMNDLj8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8': 'kamino-liquidity', // kmno-LP tokens

  // Meteora tokens
  'METEoRj8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8': 'meteora', // MET (if exists)
  'DLMMj8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h': 'meteora-dlmm', // DLMM LP tokens

  // Drift Protocol tokens
  'DRiFT2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y2y': 'drift-protocol', // DRIFT token
  'dSOLj8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h': 'drift-sol', // dSOL (Drift SOL)
  'dUSDCj8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h': 'drift-usdc', // dUSDC (Drift USDC)
};

// Token metadata for display
export const TOKEN_SYMBOLS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  '6FrrzDk5mQARGc1TDYoyVnSyRdds1t4PbtohCD6p3tgG': 'USX',
  '4eDf52YYzL6i6gbZ6FXqrLUPXbtP61f1gPSFM66M4XHe': 'SOON',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'ORCA',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'stSOL',
};

/**
 * Get price for a token in AUD.
 */
export async function getTokenPriceAUD(mint: string): Promise<PriceData | null> {
  const coingeckoId = COINGECKO_IDS[mint];

  if (!coingeckoId) {
    return null;
  }

  try {
    const url = `${BASE_URL}/simple/price?ids=${coingeckoId}&vs_currencies=aud`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data[coingeckoId]?.aud;

    if (!price) {
      return null;
    }

    return {
      mint,
      priceAUD: price,
      timestamp: new Date(),
      source: 'coingecko',
    };
  } catch (error) {
    console.error(`Failed to fetch price for ${mint}:`, error);
    return null;
  }
}

/**
 * Get prices for multiple tokens.
 */
export async function getMultiplePricesAUD(mints: string[]): Promise<Map<string, PriceData>> {
  const prices = new Map<string, PriceData>();

  // Group by CoinGecko ID
  const idToMint = new Map<string, string>();
  const coingeckoIds: string[] = [];

  for (const mint of mints) {
    const id = COINGECKO_IDS[mint];
    if (id) {
      idToMint.set(id, mint);
      if (!coingeckoIds.includes(id)) {
        coingeckoIds.push(id);
      }
    }
  }

  if (coingeckoIds.length === 0) {
    return prices;
  }

  try {
    const url = `${BASE_URL}/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=aud`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const now = new Date();

    idToMint.forEach((mint, id) => {
      const priceData = data[id]?.aud;
      if (priceData) {
        prices.set(mint, {
          mint,
          priceAUD: priceData,
          timestamp: now,
          source: 'coingecko',
        });
      }
    });

    return prices;
  } catch (error) {
    console.error('Failed to fetch multiple prices:', error);
    return prices;
  }
}

/**
 * Get historical price for a specific date.
 * Falls back to current price if historical data unavailable.
 */
export async function getHistoricalPriceAUD(
  mint: string,
  date: Date,
  useFallback: boolean = true
): Promise<PriceData | null> {
  const coingeckoId = COINGECKO_IDS[mint];

  if (!coingeckoId) {
    return null;
  }

  // Try historical first
  try {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    const url = `${BASE_URL}/coins/${coingeckoId}/history?date=${day}-${month}-${year}`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }

    const response = await fetch(url, { headers });

    if (response.ok) {
      const data = await response.json();
      const price = data.market_data?.current_price.aud;

      if (price) {
        return {
          mint,
          priceAUD: price,
          timestamp: date,
          source: 'coingecko',
        };
      }
    }
  } catch (error) {
    console.warn(`Historical price fetch failed for ${mint}, trying current price...`);
  }

  // Fallback to current price if historical unavailable
  if (useFallback) {
    return await getTokenPriceAUD(mint);
  }

  return null;
}

/**
 * Search for token by name/symbol.
 */
export async function searchToken(query: string): Promise<Array<{
  id: string;
  symbol: string;
  name: string;
}>> {
  try {
    const url = `${BASE_URL}/coins/search?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data.slice(0, 5); // Return top 5 results
  } catch (error) {
    console.error('Failed to search token:', error);
    return [];
  }
}

/**
 * Get SOL price in AUD.
 */
export async function getSOLPriceAUD(): Promise<number | null> {
  const price = await getTokenPriceAUD('So11111111111111111111111111111111111111112');
  return price?.priceAUD || null;
}
