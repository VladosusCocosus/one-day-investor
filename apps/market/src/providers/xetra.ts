import { createLogger } from "@logger";
import type { AssetRecord, MarketProvider } from "./types";

const log = createLogger("provider-xetra");

interface XetraStock {
  isin: string;
  name: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchXetraPage(
  offset: number,
  limit = 300,
): Promise<XetraStock[]> {
  const res = await fetch(
    "https://api.boerse-frankfurt.de/v1/search/equity_search",
    {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ offset, limit }),
    },
  );
  if (!res.ok) {
    log.warn({ status: res.status, offset }, "Xetra page failed");
    return [];
  }
  const data = await res.json();
  return (data.data ?? []).map(
    (d: { isin: string; name: { originalValue: string } }) => ({
      isin: d.isin,
      name: d.name.originalValue,
    }),
  );
}

async function resolveYahooTicker(isin: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=1&newsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.quotes?.[0]?.symbol ?? null;
  } catch {
    return null;
  }
}

async function fetchAllXetraStocks(): Promise<AssetRecord[]> {
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

  log.info(
    { total: allStocks.length },
    "All Xetra ISINs fetched, resolving Yahoo tickers",
  );

  // Step 2: Resolve ISINs to Yahoo tickers in batches
  const resolved: AssetRecord[] = [];
  const batchSize = 5; // parallel requests per batch

  for (let i = 0; i < allStocks.length; i += batchSize) {
    const batch = allStocks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (stock) => {
        const ticker = await resolveYahooTicker(stock.isin);
        if (!ticker) return null;
        return {
          symbol: ticker,
          name: stock.name,
          asset_type: "invest" as const,
          api_id: ticker,
          isin: stock.isin,
        };
      }),
    );
    for (const r of results) {
      if (r) resolved.push(r);
    }
    if (i % 100 === 0 && i > 0) {
      log.info(
        { resolved: resolved.length, processed: i, total: allStocks.length },
        "Xetra ticker resolution progress",
      );
    }
    await sleep(200); // Yahoo rate limit
  }

  log.info(
    { total: resolved.length, unresolved: allStocks.length - resolved.length },
    "Xetra stocks resolved",
  );
  return resolved;
}

export const xetraProvider: MarketProvider = {
  name: "xetra",
  description:
    "Xetra / Deutsche Börse equity list (German + cross-listed EU stocks), resolved to Yahoo tickers via ISIN search",
  async fetch(): Promise<AssetRecord[]> {
    return fetchAllXetraStocks();
  },
};
