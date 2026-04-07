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

// --- European stocks: major indices constituents ---
// Nasdaq API only covers US. For EU we use curated major index constituents.
// These are the tickers as listed on Yahoo Finance.

const EU_STOCKS = [
  // EURO STOXX 50
  { symbol: "ADS.DE", name: "Adidas AG" },
  { symbol: "AIR.PA", name: "Airbus SE" },
  { symbol: "ALV.DE", name: "Allianz SE" },
  { symbol: "ASML.AS", name: "ASML Holding NV" },
  { symbol: "BAS.DE", name: "BASF SE" },
  { symbol: "BAYN.DE", name: "Bayer AG" },
  { symbol: "BMW.DE", name: "BMW AG" },
  { symbol: "BNP.PA", name: "BNP Paribas SA" },
  { symbol: "CRH.L", name: "CRH PLC" },
  { symbol: "CS.PA", name: "AXA SA" },
  { symbol: "DAI.DE", name: "Mercedes-Benz Group" },
  { symbol: "DHL.DE", name: "Deutsche Post AG" },
  { symbol: "DTE.DE", name: "Deutsche Telekom AG" },
  { symbol: "ENEL.MI", name: "Enel SpA" },
  { symbol: "ENI.MI", name: "Eni SpA" },
  { symbol: "FRE.DE", name: "Fresenius SE" },
  { symbol: "IFX.DE", name: "Infineon Technologies" },
  { symbol: "ISP.MI", name: "Intesa Sanpaolo" },
  { symbol: "KER.PA", name: "Kering SA" },
  { symbol: "LIN.DE", name: "Linde PLC" },
  { symbol: "MC.PA", name: "LVMH" },
  { symbol: "MUV2.DE", name: "Munich Re" },
  { symbol: "OR.PA", name: "L'Oreal SA" },
  { symbol: "ORA.PA", name: "Orange SA" },
  { symbol: "PHIA.AS", name: "Philips NV" },
  { symbol: "RMS.PA", name: "Hermes International" },
  { symbol: "SAF.PA", name: "Safran SA" },
  { symbol: "SAN.PA", name: "Sanofi SA" },
  { symbol: "SAP.DE", name: "SAP SE" },
  { symbol: "SIE.DE", name: "Siemens AG" },
  { symbol: "SU.PA", name: "Schneider Electric" },
  { symbol: "TTE.PA", name: "TotalEnergies SE" },
  { symbol: "VOW3.DE", name: "Volkswagen AG" },
  // FTSE 100 (selected)
  { symbol: "AZN.L", name: "AstraZeneca PLC" },
  { symbol: "BA.L", name: "BAE Systems" },
  { symbol: "BARC.L", name: "Barclays PLC" },
  { symbol: "BP.L", name: "BP PLC" },
  { symbol: "DGE.L", name: "Diageo PLC" },
  { symbol: "GSK.L", name: "GSK PLC" },
  { symbol: "HSBA.L", name: "HSBC Holdings" },
  { symbol: "LSEG.L", name: "London Stock Exchange" },
  { symbol: "RIO.L", name: "Rio Tinto PLC" },
  { symbol: "SHEL.L", name: "Shell PLC" },
  { symbol: "ULVR.L", name: "Unilever PLC" },
  { symbol: "VOD.L", name: "Vodafone Group" },
  // IBEX 35 (selected)
  { symbol: "BBVA.MC", name: "BBVA SA" },
  { symbol: "SAN.MC", name: "Banco Santander" },
  { symbol: "ITX.MC", name: "Inditex SA" },
  { symbol: "IBE.MC", name: "Iberdrola SA" },
  { symbol: "TEF.MC", name: "Telefonica SA" },
  { symbol: "REP.MC", name: "Repsol SA" },
  // SMI (selected)
  { symbol: "NESN.SW", name: "Nestle SA" },
  { symbol: "NOVN.SW", name: "Novartis AG" },
  { symbol: "ROG.SW", name: "Roche Holding AG" },
  { symbol: "UBSG.SW", name: "UBS Group AG" },
  { symbol: "ZURN.SW", name: "Zurich Insurance" },
  // Nordic (selected)
  { symbol: "NVO", name: "Novo Nordisk" },
  { symbol: "ERIC-B.ST", name: "Ericsson" },
  { symbol: "VOLV-B.ST", name: "Volvo AB" },
  { symbol: "NOKIA.HE", name: "Nokia Oyj" },
  { symbol: "MAERSK-B.CO", name: "Maersk" },
  // Other major EU
  { symbol: "AD.AS", name: "Ahold Delhaize" },
  { symbol: "INGA.AS", name: "ING Group NV" },
  { symbol: "UCG.MI", name: "UniCredit SpA" },
  { symbol: "G.MI", name: "Assicurazioni Generali" },
  { symbol: "BN.PA", name: "Danone SA" },
  { symbol: "AI.PA", name: "Air Liquide SA" },
  { symbol: "DSY.PA", name: "Dassault Systemes" },
  { symbol: "FP.PA", name: "TotalEnergies SE" },
];

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

  // European stocks
  const euAssets = EU_STOCKS.map((s) => ({
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
    { crypto: cryptoAssets.length, stocks: stockAssets.length, eu: euAssets.length, etfs: etfAssets.length },
    "Total assets to upsert"
  );

  const cryptoResult = await upsertAssets(cryptoAssets);
  log.info(cryptoResult, "Crypto assets upserted");

  const stockResult = await upsertAssets(stockAssets);
  log.info(stockResult, "US stock assets upserted");

  const euResult = await upsertAssets(euAssets);
  log.info(euResult, "EU stock assets upserted");

  const etfResult = await upsertAssets(etfAssets);
  log.info(etfResult, "ETF assets upserted");

  const total = cryptoAssets.length + stockAssets.length + euAssets.length + etfAssets.length;
  log.info({ total }, "Seed complete");
  await pool.end();
}

main().catch((err) => {
  log.error({ err }, "Seed script failed");
  process.exit(1);
});
