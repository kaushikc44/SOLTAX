// SolTax AU - CoinGecko Price API
import type { PriceData } from '@/types';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const BASE_URL = 'https://api.coingecko.com/api/v3';

// Common Solana tokens and their CoinGecko IDs
export const COINGECKO_IDS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'solana',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'bonk',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'jupiter-exchange-solana',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'raydium',
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'orca',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'msol',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'jito-governance-token',
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

    for (const [id, mint] of idToMint) {
      const priceData = data[id]?.aud;
      if (priceData) {
        prices.set(mint, {
          mint,
          priceAUD: priceData,
          timestamp: now,
          source: 'coingecko',
        });
      }
    }

    return prices;
  } catch (error) {
    console.error('Failed to fetch multiple prices:', error);
    return prices;
  }
}

/**
 * Get historical price for a specific date.
 */
export async function getHistoricalPriceAUD(
  mint: string,
  date: Date
): Promise<PriceData | null> {
  const coingeckoId = COINGECKO_IDS[mint];

  if (!coingeckoId) {
    return null;
  }

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

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.market_data?.current_price.aud;

    if (!price) {
      return null;
    }

    return {
      mint,
      priceAUD: price,
      timestamp: date,
      source: 'coingecko',
    };
  } catch (error) {
    console.error(`Failed to fetch historical price for ${mint}:`, error);
    return null;
  }
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
