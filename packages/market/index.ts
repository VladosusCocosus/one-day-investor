import { createLogger } from "@logger";

const log = createLogger("market");

export type AssetType = "crypto" | "invest";

export async function fetchCryptoPrices(
  ids: string[],
  currency: string
): Promise<Record<string, number | null>> {
  if (ids.length === 0) return {};
  const result: Record<string, number | null> = {};
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=${currency.toLowerCase()}`;
    log.info({ ids, currency }, "Fetching crypto prices from CoinGecko");
    const res = await fetch(url);
    if (!res.ok) {
      log.warn({ status: res.status, ids }, "CoinGecko API returned non-OK status");
      for (const id of ids) result[id] = null;
      return result;
    }
    const data = await res.json();
    const cur = currency.toLowerCase();
    for (const id of ids) {
      result[id] = data[id]?.[cur] ?? null;
    }
    log.info({ count: ids.length, resolved: Object.values(result).filter((v) => v !== null).length }, "Crypto prices fetched");
  } catch (err) {
    log.error({ err, ids }, "CoinGecko API request failed");
    for (const id of ids) result[id] = null;
  }
  return result;
}

export async function fetchStockPrices(
  symbols: string[]
): Promise<Record<string, number | null>> {
  if (symbols.length === 0) return {};
  const result: Record<string, number | null> = {};
  try {
    const joined = symbols.join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${joined}&fields=regularMarketPrice`;
    log.info({ symbols }, "Fetching stock prices from Yahoo Finance");
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      log.warn({ status: res.status, symbols }, "Yahoo Finance API returned non-OK status");
      for (const s of symbols) result[s] = null;
      return result;
    }
    const data = await res.json();
    const quotes = data?.quoteResponse?.result ?? [];
    for (const s of symbols) {
      const quote = quotes.find((q: { symbol: string }) => q.symbol === s);
      result[s] = quote?.regularMarketPrice ?? null;
    }
    log.info({ count: symbols.length, resolved: Object.values(result).filter((v) => v !== null).length }, "Stock prices fetched");
  } catch (err) {
    log.error({ err, symbols }, "Yahoo Finance API request failed");
    for (const s of symbols) result[s] = null;
  }
  return result;
}

export async function fetchPrices(
  assets: { api_id: string; asset_type: AssetType }[],
  currency: string
): Promise<Record<string, number | null>> {
  const cryptoIds = assets
    .filter((a) => a.asset_type === "crypto")
    .map((a) => a.api_id);
  const stockSymbols = assets
    .filter((a) => a.asset_type === "invest")
    .map((a) => a.api_id);

  log.info({ cryptoCount: cryptoIds.length, stockCount: stockSymbols.length, currency }, "Fetching all prices");

  const [cryptoPrices, stockPrices] = await Promise.all([
    fetchCryptoPrices(cryptoIds, currency),
    fetchStockPrices(stockSymbols),
  ]);

  return { ...cryptoPrices, ...stockPrices };
}
