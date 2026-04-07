/**
 * Fetches ALL crypto from CoinGecko and ALL stocks/ETFs from Nasdaq
 * screener by paginating until no more results, then upserts into
 * asset_catalog.
 *
 * Usage: bun run scripts/seed-asset-catalog.ts
 */

import { pool } from "../pool";
import { createLogger } from "@logger";

const log = createLogger("seed-asset-catalog");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Crypto: CoinGecko — fetch ALL pages ---

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
    // CoinGecko free tier: 30 calls/min
    await sleep(2500);
  }

  log.info({ total: all.length, pages: page }, "All crypto coins fetched");
  return all;
}

// --- Stocks: Nasdaq screener — paginate ALL ---

interface NasdaqStockRow {
  symbol: string;
  name: string;
}

async function fetchStockPage(offset: number, limit = 500): Promise<NasdaqStockRow[]> {
  const url = `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=${limit}&offset=${offset}&exchange=NASDAQ,NYSE,AMEX&sortcolumn=marketcap&sortorder=desc`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
  });
  if (!res.ok) {
    log.warn({ status: res.status, offset }, "Nasdaq stocks page failed");
    return [];
  }
  const data = await res.json();
  const rows: { symbol: string; name: string }[] = data?.data?.table?.rows ?? [];
  return rows
    .filter((r) => r.symbol && r.name && !r.symbol.includes("^"))
    .map((r) => ({
      symbol: r.symbol.trim(),
      name: r.name.trim().replace(/&amp;/g, "&"),
    }));
}

async function fetchAllStocks(): Promise<NasdaqStockRow[]> {
  const limit = 500;
  const all: NasdaqStockRow[] = [];
  let offset = 0;

  while (true) {
    log.info({ offset, fetched: all.length }, "Fetching stocks page from Nasdaq");
    const rows = await fetchStockPage(offset, limit);
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
    await sleep(1000);
  }

  log.info({ total: all.length }, "All stocks fetched");
  return all;
}

// --- ETFs: Nasdaq ETF screener — paginate ALL ---

interface NasdaqETFRow {
  symbol: string;
  companyName: string;
}

async function fetchETFPage(offset: number, limit = 500): Promise<{ symbol: string; name: string }[]> {
  const url = `https://api.nasdaq.com/api/screener/etf?tableonly=true&limit=${limit}&offset=${offset}&sortcolumn=lastsharetradevalue&sortorder=desc`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
  });
  if (!res.ok) {
    log.warn({ status: res.status, offset }, "Nasdaq ETF page failed");
    return [];
  }
  const data = await res.json();
  const rows: NasdaqETFRow[] = data?.data?.table?.rows ?? [];
  return rows
    .filter((r) => r.symbol && r.companyName)
    .map((r) => ({
      symbol: r.symbol.trim(),
      name: r.companyName.trim().replace(/&amp;/g, "&"),
    }));
}

async function fetchAllETFs(): Promise<{ symbol: string; name: string }[]> {
  const limit = 500;
  const all: { symbol: string; name: string }[] = [];
  let offset = 0;

  while (true) {
    log.info({ offset, fetched: all.length }, "Fetching ETFs page from Nasdaq");
    const rows = await fetchETFPage(offset, limit);
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
    await sleep(1000);
  }

  log.info({ total: all.length }, "All ETFs fetched");
  return all;
}

// --- European stocks: Euronext live data — paginate ALL ---
// Covers Paris, Amsterdam, Brussels, Lisbon, Milan, Oslo, Dublin

// Euronext MIC → Yahoo Finance suffix mapping
const MIC_TO_YAHOO: Record<string, string> = {
  XPAR: ".PA",
  XAMS: ".AS",
  XBRU: ".BR",
  XLIS: ".LS",
  XMIL: ".MI",
  XOSL: ".OL",
  XDUB: ".IR",
};

async function fetchEuronextPage(start: number, length = 100): Promise<{ symbol: string; name: string }[]> {
  const url = "https://live.euronext.com/en/pd/data/stocks?mics=XAMS,XBRU,XLIS,XPAR,XMIL,XOSL,XDUB&display_datapoints=dp_stocks&display_filters=df_stocks";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: `draw=1&start=${start}&length=${length}&iDisplayLength=${length}&iDisplayStart=${start}`,
  });
  if (!res.ok) {
    log.warn({ status: res.status, start }, "Euronext page failed");
    return [];
  }
  const data = await res.json();
  const rows: string[][] = data?.aaData ?? [];

  return rows
    .map((row) => {
      // Field 0: HTML with data-order='NAME'
      const nameMatch = row[0]?.match(/data-order='([^']+)'/);
      // Field 2: ticker
      const ticker = row[2]?.trim();
      // Field 3: HTML with MIC code like >XPAR</div>
      const micMatch = row[3]?.match(/>(\w+)<\/div>/);
      const mic = micMatch?.[1] ?? "";
      const suffix = MIC_TO_YAHOO[mic] ?? "";

      if (!ticker || !nameMatch?.[1] || !suffix) return null;

      const yahooSymbol = `${ticker}${suffix}`;
      return { symbol: yahooSymbol, name: nameMatch[1] };
    })
    .filter((r): r is { symbol: string; name: string } => r !== null);
}

async function fetchAllEuronextStocks(): Promise<{ symbol: string; name: string }[]> {
  const pageSize = 100;
  const all: { symbol: string; name: string }[] = [];
  let start = 0;

  while (true) {
    log.info({ start, fetched: all.length }, "Fetching Euronext stocks page");
    const rows = await fetchEuronextPage(start, pageSize);
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
    start += pageSize;
    await sleep(500);
  }

  log.info({ total: all.length }, "All Euronext stocks fetched");
  return all;
}

// --- Xetra / Deutsche Börse — paginate ALL, resolve tickers via Yahoo ISIN search ---
// Covers German + many cross-listed EU stocks (Spanish, French, Italian, etc.)

interface XetraStock {
  isin: string;
  name: string;
}

async function fetchXetraPage(offset: number, limit = 300): Promise<XetraStock[]> {
  const res = await fetch("https://api.boerse-frankfurt.de/v1/search/equity_search", {
    method: "POST",
    headers: { "User-Agent": "Mozilla/5.0", "Content-Type": "application/json" },
    body: JSON.stringify({ offset, limit }),
  });
  if (!res.ok) {
    log.warn({ status: res.status, offset }, "Xetra page failed");
    return [];
  }
  const data = await res.json();
  return (data.data ?? []).map((d: { isin: string; name: { originalValue: string } }) => ({
    isin: d.isin,
    name: d.name.originalValue,
  }));
}

async function resolveYahooTicker(isin: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=1&newsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.quotes?.[0]?.symbol ?? null;
  } catch {
    return null;
  }
}

async function fetchAllXetraStocks(): Promise<{ symbol: string; name: string }[]> {
  // Step 1: Fetch all ISINs from Xetra
  const limit = 300; // Xetra caps at 300 per page
  const allStocks: XetraStock[] = [];
  let offset = 0;

  while (true) {
    log.info({ offset, fetched: allStocks.length }, "Fetching Xetra stocks page");
    const rows = await fetchXetraPage(offset, limit);
    if (rows.length === 0) break;
    allStocks.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
    await sleep(300);
  }

  log.info({ total: allStocks.length }, "All Xetra ISINs fetched, resolving Yahoo tickers");

  // Step 2: Resolve ISINs to Yahoo tickers in batches
  const resolved: { symbol: string; name: string }[] = [];
  const batchSize = 5; // parallel requests per batch

  for (let i = 0; i < allStocks.length; i += batchSize) {
    const batch = allStocks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (stock) => {
        const ticker = await resolveYahooTicker(stock.isin);
        return ticker ? { symbol: ticker, name: stock.name } : null;
      })
    );
    for (const r of results) {
      if (r) resolved.push(r);
    }
    if (i % 100 === 0 && i > 0) {
      log.info({ resolved: resolved.length, processed: i, total: allStocks.length }, "Xetra ticker resolution progress");
    }
    await sleep(200); // Yahoo rate limit
  }

  log.info({ total: resolved.length, unresolved: allStocks.length - resolved.length }, "Xetra stocks resolved");
  return resolved;
}

// --- Upsert into DB ---

async function upsertAssets(
  assets: { symbol: string; name: string; asset_type: "crypto" | "invest"; api_id: string }[]
) {
  let upserted = 0;
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

// --- Main ---

async function main() {
  log.info("Starting asset catalog seed — fetching ALL available assets");

  // Crypto — all pages from CoinGecko
  const coins = await fetchAllCrypto();
  const seen = new Set<string>();
  const cryptoAssets = coins
    .filter((c) => {
      const sym = c.symbol.toUpperCase();
      if (seen.has(sym)) return false;
      seen.add(sym);
      return true;
    })
    .map((c) => ({
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      asset_type: "crypto" as const,
      api_id: c.id,
    }));

  // Stocks — all pages from Nasdaq
  const stocks = await fetchAllStocks();
  const stockAssets = stocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    asset_type: "invest" as const,
    api_id: s.symbol,
  }));

  // European stocks — Euronext (Paris, Amsterdam, Brussels, Lisbon, Milan, Oslo, Dublin)
  const euStocks = await fetchAllEuronextStocks();
  const euAssets = euStocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    asset_type: "invest" as const,
    api_id: s.symbol,
  }));

  // Xetra / Deutsche Börse — German + cross-listed EU stocks (Madrid, Swiss, etc.)
  const xetraStocks = await fetchAllXetraStocks();
  const xetraAssets = xetraStocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    asset_type: "invest" as const,
    api_id: s.symbol,
  }));

  // ETFs — all pages from Nasdaq
  const etfs = await fetchAllETFs();
  const etfAssets = etfs.map((e) => ({
    symbol: e.symbol,
    name: e.name,
    asset_type: "invest" as const,
    api_id: e.symbol,
  }));

  log.info(
    { crypto: cryptoAssets.length, usStocks: stockAssets.length, euronext: euAssets.length, xetra: xetraAssets.length, etfs: etfAssets.length },
    "Total assets to upsert"
  );

  const cryptoResult = await upsertAssets(cryptoAssets);
  log.info(cryptoResult, "Crypto assets upserted");

  const stockResult = await upsertAssets(stockAssets);
  log.info(stockResult, "US stock assets upserted");

  const euResult = await upsertAssets(euAssets);
  log.info(euResult, "Euronext stock assets upserted");

  const xetraResult = await upsertAssets(xetraAssets);
  log.info(xetraResult, "Xetra stock assets upserted");

  const etfResult = await upsertAssets(etfAssets);
  log.info(etfResult, "ETF assets upserted");

  const total = cryptoAssets.length + stockAssets.length + euAssets.length + xetraAssets.length + etfAssets.length;
  log.info({ total }, "Seed complete");
  await pool.end();
}

main().catch((err) => {
  log.error({ err }, "Seed script failed");
  process.exit(1);
});
