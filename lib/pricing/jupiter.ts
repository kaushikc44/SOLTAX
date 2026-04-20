// SolTax AU - Jupiter Price API v2
// Fast, free, no API key. Covers every token listed on Solana DEXes. USD only —
// we convert to AUD using a cached FX rate below.
//
// https://station.jup.ag/docs/apis/price-api-v2

const JUPITER_PRICE_URL = 'https://api.jup.ag/price/v2';
const FX_URL = 'https://open.er-api.com/v6/latest/USD';

interface JupiterPriceResponse {
  data: Record<string, { id: string; type: string; price: string } | null>;
}

interface JupiterPrice {
  mint: string;
  priceUSD: number;
  priceAUD: number;
}

// FX rate cache: one value, refreshed at most hourly.
let fxCache: { rate: number; fetchedAt: number } | null = null;
const FX_TTL_MS = 60 * 60 * 1000;

async function getUSDtoAUD(): Promise<number> {
  if (fxCache && Date.now() - fxCache.fetchedAt < FX_TTL_MS) {
    return fxCache.rate;
  }
  try {
    const res = await fetch(FX_URL, { next: { revalidate: 3600 } as any });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.AUD;
      if (typeof rate === 'number' && rate > 0) {
        fxCache = { rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch {
    // fall through
  }
  // Fallback ~mid-2025 rate. Stale rate is better than no price.
  const fallback = fxCache?.rate ?? 1.55;
  fxCache = { rate: fallback, fetchedAt: Date.now() };
  return fallback;
}

/**
 * Fetch current prices for the given mints, in AUD.
 * Returns a map keyed by mint. Missing mints just aren't in the map.
 * Jupiter accepts up to ~100 ids per request.
 */
export async function getJupiterPricesAUD(mints: string[]): Promise<Map<string, JupiterPrice>> {
  const out = new Map<string, JupiterPrice>();
  if (mints.length === 0) return out;

  const unique = Array.from(new Set(mints));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));

  const [fx, ...responses] = await Promise.all([
    getUSDtoAUD(),
    ...chunks.map(async (chunk) => {
      try {
        const url = `${JUPITER_PRICE_URL}?ids=${chunk.join(',')}`;
        const res = await fetch(url, { next: { revalidate: 30 } as any });
        if (!res.ok) return null;
        return (await res.json()) as JupiterPriceResponse;
      } catch {
        return null;
      }
    }),
  ]);

  for (const response of responses) {
    if (!response?.data) continue;
    for (const [mint, entry] of Object.entries(response.data)) {
      if (!entry?.price) continue;
      const priceUSD = parseFloat(entry.price);
      if (!Number.isFinite(priceUSD)) continue;
      out.set(mint, { mint, priceUSD, priceAUD: priceUSD * fx });
    }
  }

  return out;
}

export async function getJupiterPriceAUD(mint: string): Promise<JupiterPrice | null> {
  const prices = await getJupiterPricesAUD([mint]);
  return prices.get(mint) ?? null;
}
