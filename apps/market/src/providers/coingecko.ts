import { createLogger } from "@logger";
import type { AssetRecord, MarketProvider } from "./types";

const log = createLogger("provider-coingecko");

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCryptoPage(
  page: number,
  perPage = 250,
  attempt = 1,
): Promise<CoinGeckoMarket[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}`;
  const res = await fetch(url);
  if (res.status === 429 && attempt <= 4) {
    const backoff = 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s, 40s
    log.warn({ page, attempt, backoff }, "CoinGecko 429, backing off");
    await sleep(backoff);
    return fetchCryptoPage(page, perPage, attempt + 1);
  }
  if (!res.ok) {
    log.warn({ status: res.status, page }, "CoinGecko page failed");
    return [];
  }
  return (await res.json()) as CoinGeckoMarket[];
}

async function fetchAllCrypto(): Promise<CoinGeckoMarket[]> {
  const perPage = 250;
  const all: CoinGeckoMarket[] = [];
  let page = 1;

  while (true) {
    log.info({ page, fetched: all.length }, "Fetching crypto page from CoinGecko");
    const coins = await fetchCryptoPage(page, perPage);
    if (coins.length === 0) break;
    all.push(...coins);
    if (coins.length < perPage) break;
    page++;
    // CoinGecko free tier: 30 calls/min — 3s gives generous headroom.
    await sleep(3000);
  }

  log.info({ total: all.length, pages: page }, "All crypto coins fetched");
  return all;
}

export const coingeckoProvider: MarketProvider = {
  name: "coingecko",
  description: "All crypto assets from the CoinGecko public markets API",
  async fetch(): Promise<AssetRecord[]> {
    const coins = await fetchAllCrypto();
    const seen = new Set<string>();
    const records: AssetRecord[] = [];
    for (const c of coins) {
      const sym = c.symbol.toUpperCase();
      if (seen.has(sym)) continue;
      seen.add(sym);
      records.push({
        symbol: sym,
        name: c.name,
        asset_type: "crypto",
        api_id: c.id,
      });
    }
    log.info({ total: records.length }, "coingecko provider produced asset records");
    return records;
  },
};
