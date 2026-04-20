// SolTax AU - Historical Pricing Engine
// Fetches and caches historical token prices for tax calculations

import { getHistoricalPriceAUD, getTokenPriceAUD, COINGECKO_IDS } from '@/lib/utils/coingecko';
import { getJupiterPriceAUD, getJupiterPricesAUD } from '@/lib/pricing/jupiter';
import { getCachedPrice, cachePrice } from '@/lib/db/queries';

export interface PriceResult {
  priceAUD: number;
  source: 'coingecko' | 'cache' | 'estimated';
  timestamp: Date;
}

/**
 * Get historical price for a token on a specific date
 * Falls back to cache or nearest available date
 */
export async function getHistoricalPrice(
  mint: string,
  date: Date
): Promise<PriceResult | null> {
  // Check if we have cached price for this exact date
  try {
    const { data } = await getCachedPrice(mint, date);
    const cached = data as { price_aud: string | number; sourced_at: string } | null;
    if (cached?.price_aud) {
      return {
        priceAUD: Number(cached.price_aud),
        source: 'cache',
        timestamp: new Date(cached.sourced_at),
      };
    }
  } catch (error) {
    console.warn('Cache lookup failed:', error);
  }

  // CoinGecko handles historical data (Jupiter doesn't).
  try {
    const priceData = await getHistoricalPriceAUD(mint, date);
    if (priceData?.priceAUD) {
      await cachePrice({
        mint,
        price_aud: String(priceData.priceAUD),
        sourced_at: priceData.timestamp.toISOString(),
        sourced_date: date.toISOString().split('T')[0],
        source: 'coingecko',
      });
      return {
        priceAUD: priceData.priceAUD,
        source: 'coingecko',
        timestamp: priceData.timestamp,
      };
    }
  } catch (error) {
    console.warn('CoinGecko historical fetch failed, trying fallback:', error);
  }

  // Fallback: current price. Try Jupiter first (broader coverage + fast),
  // then CoinGecko. Label as 'estimated' since it's not the block-time price.
  try {
    const jup = await getJupiterPriceAUD(mint);
    if (jup?.priceAUD) {
      return { priceAUD: jup.priceAUD, source: 'estimated', timestamp: new Date() };
    }
  } catch (error) {
    console.warn('Jupiter price fetch failed:', error);
  }

  try {
    const currentPrice = await getTokenPriceAUD(mint);
    if (currentPrice?.priceAUD) {
      return {
        priceAUD: currentPrice.priceAUD,
        source: 'estimated',
        timestamp: currentPrice.timestamp,
      };
    }
  } catch (error) {
    console.warn('Current price fetch failed:', error);
  }

  return null;
}

/**
 * Fast current-price fetch for many mints using Jupiter. Good for live UI.
 */
export async function getCurrentPricesAUD(mints: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (mints.length === 0) return out;

  const jup = await getJupiterPricesAUD(mints);
  for (const [mint, p] of Array.from(jup.entries())) {
    out.set(mint, p.priceAUD);
  }
  return out;
}

/**
 * Get prices for multiple tokens on their respective dates
 */
export async function getHistoricalPrices(
  transactions: Array<{
    mint: string;
    date: Date;
  }>
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  const cache = new Map<string, Promise<PriceResult | null>>();

  for (const tx of transactions) {
    const key = `${tx.mint}-${tx.date.toISOString().split('T')[0]}`;

    if (!cache.has(key)) {
      cache.set(key, getHistoricalPrice(tx.mint, tx.date));
    }
  }

  for (const [key, promise] of Array.from(cache.entries())) {
    const result = await promise;
    if (result) {
      results.set(key, result);
    }
  }

  return results;
}

/**
 * Calculate AUD value for a token amount
 */
export function calculateAUDValue(amount: string | number | null, priceAUD: number): number {
  if (!amount || priceAUD <= 0) return 0;
  const amt = typeof amount === 'string' ? parseFloat(amount) : amount;
  return amt * priceAUD;
}

/**
 * Get all unique mints from transactions that need pricing
 */
export function getMintsNeedingPricing(transactions: any[]): Set<string> {
  const mints = new Set<string>();

  for (const tx of transactions) {
    if (tx.token_in_mint && tx.token_in_mint !== 'unknown') {
      mints.add(tx.token_in_mint);
    }
    if (tx.token_out_mint && tx.token_out_mint !== 'unknown') {
      mints.add(tx.token_out_mint);
    }
  }

  return mints;
}

/**
 * Whether we should attempt to price this mint. Jupiter covers ~any Solana
 * token, so we only bail on obviously empty inputs.
 */
export function isKnownMint(mint: string): boolean {
  if (!mint || mint === 'unknown') return false;
  // CoinGecko coverage covers historical; Jupiter covers everything current.
  // Returning true opts the mint into Jupiter fallback.
  return true;
}

/**
 * Whether CoinGecko has a mapping for this mint — useful to decide whether a
 * historical lookup is worth attempting.
 */
export function hasCoingeckoId(mint: string): boolean {
  return mint in COINGECKO_IDS;
}

/**
 * Batch fetch prices for all tokens in transactions
 */
export async function fetchPricesForTransactions(
  transactions: any[]
): Promise<Map<string, Map<string, PriceResult>>> {
  // Group by date and mint
  const priceRequests = new Map<string, Map<string, Date>>();

  for (const tx of transactions) {
    const date = new Date(tx.block_time);
    const dateStr = date.toISOString().split('T')[0];

    if (!priceRequests.has(dateStr)) {
      priceRequests.set(dateStr, new Map());
    }

    const dateMap = priceRequests.get(dateStr)!;

    if (tx.token_in_mint && isKnownMint(tx.token_in_mint)) {
      dateMap.set(tx.token_in_mint, date);
    }
    if (tx.token_out_mint && isKnownMint(tx.token_out_mint)) {
      dateMap.set(tx.token_out_mint, date);
    }
  }

  // Fetch all prices
  const results = new Map<string, Map<string, PriceResult>>();

  for (const [dateStr, mints] of Array.from(priceRequests.entries())) {
    const dateResults = new Map<string, PriceResult>();

    for (const [mint, date] of Array.from(mints.entries())) {
      const price = await getHistoricalPrice(mint, date);
      if (price) {
        dateResults.set(mint, price);
      }
    }

    results.set(dateStr, dateResults);
  }

  return results;
}
