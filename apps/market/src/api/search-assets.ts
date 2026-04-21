import { Elysia } from "elysia";
import { createLogger } from "@logger";
import { cacheGet, cacheSet } from "@redis";

const log = createLogger("market-search");
const SEARCH_CACHE_TTL = 60 * 60; // 1 hour — ISIN→symbol mappings change rarely

export interface AssetSearchCandidate {
  symbol: string;
  name: string | null;
  exchange: string | null;
  exchangeDisplay: string | null;
  quoteType: string | null;
  apiId: string;        // ticker used for price lookups (Yahoo-compatible)
  isin: string | null;  // echoed from query when the user searched by ISIN
}

/**
 * Proxies Yahoo Finance's public search endpoint. Works for ISIN queries
 * (returns the primary listing) and free-text symbol/name queries (returns
 * multiple candidates sorted by Yahoo's relevance ranking).
 *
 * We intentionally cache the full response since Yahoo rate-limits anonymous
 * callers and ISIN lookups are stable.
 */
async function searchYahoo(query: string): Promise<AssetSearchCandidate[]> {
  const cacheKey = `asset-search:${query.toLowerCase()}`;
  const cached = await cacheGet<AssetSearchCandidate[]>(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0`;
  const isIsin = /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(query);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      log.warn({ status: res.status, query }, "Yahoo search non-OK");
      return [];
    }
    const data = (await res.json()) as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchange?: string;
        exchDisp?: string;
        quoteType?: string;
      }>;
    };
    const results: AssetSearchCandidate[] = (data.quotes ?? [])
      .filter((q) => q.symbol)
      .map((q) => ({
        symbol: q.symbol!,
        name: q.longname ?? q.shortname ?? null,
        exchange: q.exchange ?? null,
        exchangeDisplay: q.exchDisp ?? null,
        quoteType: q.quoteType ?? null,
        apiId: q.symbol!,
        isin: isIsin ? query : null,
      }));
    await cacheSet(cacheKey, results, SEARCH_CACHE_TTL);
    return results;
  } catch (err) {
    log.error({ err, query }, "Yahoo search failed");
    return [];
  }
}

export const searchAssetsApi = new Elysia({ prefix: "/api/market" })
  .get("/search-assets", async ({ query, set }) => {
    const q = typeof query.q === "string" ? query.q.trim() : "";
    if (!q) {
      set.status = 400;
      return { error: "q is required" };
    }
    return searchYahoo(q);
  });

export { searchYahoo };
