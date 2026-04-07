/**
 * Fetches top crypto from CoinGecko and popular stocks/ETFs,
 * then upserts them into the asset_catalog table.
 *
 * Usage: bun run scripts/seed-asset-catalog.ts
 */

import { pool } from "../pool";
import { createLogger } from "@logger";

const log = createLogger("seed-asset-catalog");

// --- Crypto: fetch top coins from CoinGecko ---

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
}

async function fetchTopCrypto(limit = 100): Promise<CoinGeckoMarket[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1`;
  log.info({ limit }, "Fetching top crypto from CoinGecko");
  const res = await fetch(url);
  if (!res.ok) {
    log.error({ status: res.status }, "CoinGecko markets API failed");
    return [];
  }
  const data = (await res.json()) as CoinGeckoMarket[];
  log.info({ count: data.length }, "Crypto coins fetched");
  return data;
}

// --- Stocks/ETFs: curated list of popular tickers ---

const STOCKS = [
  // US Mega Cap
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "BRK-B", name: "Berkshire Hathaway B" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "UNH", name: "UnitedHealth Group" },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "PG", name: "Procter & Gamble" },
  { symbol: "HD", name: "Home Depot" },
  { symbol: "XOM", name: "Exxon Mobil" },
  { symbol: "KO", name: "Coca-Cola Co." },
  { symbol: "PEP", name: "PepsiCo Inc." },
  { symbol: "ABBV", name: "AbbVie Inc." },
  { symbol: "COST", name: "Costco Wholesale" },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "MRK", name: "Merck & Co." },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "TMO", name: "Thermo Fisher" },
  { symbol: "ORCL", name: "Oracle Corp." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "AMD", name: "AMD Inc." },
  { symbol: "INTC", name: "Intel Corp." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "CSCO", name: "Cisco Systems" },
  // EU Stocks
  { symbol: "ASML", name: "ASML Holding" },
  { symbol: "SAP", name: "SAP SE" },
  { symbol: "NVO", name: "Novo Nordisk" },
  { symbol: "TM", name: "Toyota Motor" },
  { symbol: "SHEL", name: "Shell PLC" },
  { symbol: "AZN", name: "AstraZeneca" },
  // ETFs — US
  { symbol: "VOO", name: "Vanguard S&P 500 ETF" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "VTI", name: "Vanguard Total Stock" },
  { symbol: "IVV", name: "iShares Core S&P 500" },
  { symbol: "VGT", name: "Vanguard IT ETF" },
  { symbol: "SCHD", name: "Schwab US Dividend" },
  { symbol: "IWM", name: "iShares Russell 2000" },
  { symbol: "VYM", name: "Vanguard High Dividend" },
  { symbol: "ARKK", name: "ARK Innovation ETF" },
  // ETFs — International
  { symbol: "VXUS", name: "Vanguard Intl Stock" },
  { symbol: "EFA", name: "iShares MSCI EAFE" },
  { symbol: "VWO", name: "Vanguard FTSE Emerging" },
  { symbol: "EEM", name: "iShares MSCI Emerging" },
  // ETFs — Bonds
  { symbol: "AGG", name: "iShares Core US Agg Bond" },
  { symbol: "BND", name: "Vanguard Total Bond" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury" },
  // ETFs — Commodities
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "SLV", name: "iShares Silver Trust" },
  { symbol: "USO", name: "United States Oil Fund" },
];

// --- Upsert into DB ---

async function upsertAssets(
  assets: { symbol: string; name: string; asset_type: "crypto" | "invest"; api_id: string }[]
) {
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const result = await pool.query(
      `INSERT INTO asset_catalog (symbol, name, asset_type, api_id, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (symbol, asset_type) DO UPDATE SET name = $2, api_id = $4
       RETURNING id`,
      [a.symbol, a.name, a.asset_type, a.api_id, i + 1]
    );
    if (result.rowCount && result.rowCount > 0) inserted++;
    else skipped++;
  }

  return { inserted, skipped };
}

// --- Main ---

async function main() {
  log.info("Starting asset catalog seed");

  // Crypto
  const coins = await fetchTopCrypto(100);
  const cryptoAssets = coins.map((c) => ({
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    asset_type: "crypto" as const,
    api_id: c.id,
  }));

  // Stocks + ETFs
  const stockAssets = STOCKS.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    asset_type: "invest" as const,
    api_id: s.symbol, // Yahoo Finance uses the ticker as api_id
  }));

  log.info({ crypto: cryptoAssets.length, stocks: stockAssets.length }, "Assets to upsert");

  const cryptoResult = await upsertAssets(cryptoAssets);
  log.info(cryptoResult, "Crypto assets upserted");

  const stockResult = await upsertAssets(stockAssets);
  log.info(stockResult, "Stock assets upserted");

  log.info(
    { totalCrypto: cryptoAssets.length, totalStocks: stockAssets.length },
    "Seed complete"
  );

  await pool.end();
}

main().catch((err) => {
  log.error({ err }, "Seed script failed");
  process.exit(1);
});
