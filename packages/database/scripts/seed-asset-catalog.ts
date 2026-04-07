/**
 * Fetches crypto from CoinGecko (paginated, 500+) and stocks/ETFs
 * from Nasdaq screener, then upserts into asset_catalog.
 *
 * Usage: bun run scripts/seed-asset-catalog.ts
 */

import { pool } from "../pool";
import { createLogger } from "@logger";

const log = createLogger("seed-asset-catalog");

// --- Crypto: CoinGecko paginated (250 per page) ---

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
}

async function fetchCryptoPage(page: number, perPage = 250): Promise<CoinGeckoMarket[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) {
    log.warn({ status: res.status, page }, "CoinGecko page failed");
    return [];
  }
  return (await res.json()) as CoinGeckoMarket[];
}

async function fetchAllCrypto(totalCoins = 500): Promise<CoinGeckoMarket[]> {
  const perPage = 250;
  const pages = Math.ceil(totalCoins / perPage);
  const all: CoinGeckoMarket[] = [];

  for (let page = 1; page <= pages; page++) {
    log.info({ page, pages }, "Fetching crypto page from CoinGecko");
    const coins = await fetchCryptoPage(page, perPage);
    all.push(...coins);
    if (coins.length < perPage) break;
    // CoinGecko free tier: 30 calls/min, be nice
    if (page < pages) await sleep(2000);
  }

  log.info({ count: all.length }, "Total crypto coins fetched");
  return all;
}

// --- Stocks: Nasdaq screener API ---

interface NasdaqRow {
  symbol: string;
  name: string;
  marketCap: string;
}

async function fetchNasdaqStocks(limit = 500): Promise<{ symbol: string; name: string }[]> {
  const url = `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=${limit}&offset=0&exchange=NASDAQ,NYSE,AMEX&sortcolumn=marketcap&sortorder=desc`;
  log.info({ limit }, "Fetching stocks from Nasdaq screener");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    log.error({ status: res.status }, "Nasdaq screener API failed");
    return [];
  }
  const data = await res.json();
  const rows: NasdaqRow[] = data?.data?.table?.rows ?? [];
  log.info({ count: rows.length }, "Stocks fetched from Nasdaq");

  return rows
    .filter((r) => r.symbol && r.name && !r.symbol.includes("^"))
    .map((r) => ({
      symbol: r.symbol.trim(),
      name: r.name.trim().replace(/&amp;/g, "&"),
    }));
}

// --- ETFs: Nasdaq ETF screener ---

async function fetchNasdaqETFs(limit = 200): Promise<{ symbol: string; name: string }[]> {
  const url = `https://api.nasdaq.com/api/screener/etf?tableonly=true&limit=${limit}&offset=0&sortcolumn=lastsharetradevalue&sortorder=desc`;
  log.info({ limit }, "Fetching ETFs from Nasdaq screener");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    log.error({ status: res.status }, "Nasdaq ETF screener API failed");
    return [];
  }
  const data = await res.json();
  const rows: { symbol: string; companyName: string }[] = data?.data?.table?.rows ?? [];
  log.info({ count: rows.length }, "ETFs fetched from Nasdaq");

  return rows
    .filter((r) => r.symbol && r.companyName)
    .map((r) => ({
      symbol: r.symbol.trim(),
      name: r.companyName.trim().replace(/&amp;/g, "&"),
    }));
}

// --- Upsert into DB ---

async function upsertAssets(
  assets: { symbol: string; name: string; asset_type: "crypto" | "invest"; api_id: string }[]
) {
  let upserted = 0;

  // Batch upsert for performance
  const batchSize = 50;
  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders = batch.map((a, j) => {
      const offset = j * 5;
      values.push(a.symbol, a.name, a.asset_type, a.api_id, i + j + 1);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    });

    const result = await pool.query(
      `INSERT INTO asset_catalog (symbol, name, asset_type, api_id, sort_order)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (symbol, asset_type) DO UPDATE SET name = EXCLUDED.name, api_id = EXCLUDED.api_id`,
      values
    );
    upserted += result.rowCount ?? 0;
  }

  return { upserted };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main ---

async function main() {
  log.info("Starting asset catalog seed");

  // Crypto — top 500 by market cap
  const coins = await fetchAllCrypto(500);
  const seen = new Set<string>();
  const cryptoAssets = coins
    .filter((c) => {
      const sym = c.symbol.toUpperCase();
      if (seen.has(sym)) return false; // deduplicate by symbol
      seen.add(sym);
      return true;
    })
    .map((c) => ({
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      asset_type: "crypto" as const,
      api_id: c.id,
    }));

  // Stocks — top 500 by market cap from Nasdaq
  const stocks = await fetchNasdaqStocks(500);
  const stockAssets = stocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    asset_type: "invest" as const,
    api_id: s.symbol,
  }));

  // ETFs — top 200 by volume
  await sleep(1000); // be nice to Nasdaq
  const etfs = await fetchNasdaqETFs(200);
  const etfAssets = etfs.map((e) => ({
    symbol: e.symbol,
    name: e.name,
    asset_type: "invest" as const,
    api_id: e.symbol,
  }));

  log.info(
    { crypto: cryptoAssets.length, stocks: stockAssets.length, etfs: etfAssets.length },
    "Assets to upsert"
  );

  const cryptoResult = await upsertAssets(cryptoAssets);
  log.info(cryptoResult, "Crypto assets upserted");

  const stockResult = await upsertAssets(stockAssets);
  log.info(stockResult, "Stock assets upserted");

  const etfResult = await upsertAssets(etfAssets);
  log.info(etfResult, "ETF assets upserted");

  log.info("Seed complete");
  await pool.end();
}

main().catch((err) => {
  log.error({ err }, "Seed script failed");
  process.exit(1);
});
