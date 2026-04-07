import { createLogger } from "@logger";

const log = createLogger("market");

export type AssetType = "crypto" | "invest";

// --- Exchange Rate Cache ---

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

const RATE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const rateCache = new Map<string, CachedRate>();

export async function getExchangeRate(
  from: string,
  to: string
): Promise<number> {
  if (from.toUpperCase() === to.toUpperCase()) return 1;

  const key = `${from.toUpperCase()}/${to.toUpperCase()}`;
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < RATE_CACHE_TTL) {
    log.debug({ key, rate: cached.rate }, "Exchange rate cache hit");
    return cached.rate;
  }

  try {
    // ECB free API — no key needed, supports major currencies
    const url = `https://api.frankfurter.dev/v1/latest?from=${from.toUpperCase()}&to=${to.toUpperCase()}`;
    log.info({ from, to }, "Fetching exchange rate");
    const res = await fetch(url);
    if (!res.ok) {
      log.warn({ status: res.status, from, to }, "Exchange rate API non-OK");
      return cached?.rate ?? 1;
    }
    const data = await res.json();
    const rate = data?.rates?.[to.toUpperCase()];
    if (rate == null) {
      log.warn({ from, to, data }, "Exchange rate not found in response");
      return cached?.rate ?? 1;
    }

    rateCache.set(key, { rate, fetchedAt: Date.now() });
    log.info({ key, rate }, "Exchange rate cached");
    return rate;
  } catch (err) {
    log.error({ err, from, to }, "Exchange rate fetch failed");
    return cached?.rate ?? 1;
  }
}

// --- Crypto Prices (CoinGecko — natively supports target currency) ---

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

// --- Stock Prices (Yahoo Finance — returns USD, converted to target currency) ---

export async function fetchStockPrices(
  symbols: string[],
  currency: string
): Promise<Record<string, number | null>> {
  if (symbols.length === 0) return {};
  const result: Record<string, number | null> = {};

  log.info({ symbols, currency }, "Fetching stock prices from Yahoo Finance v8 chart");

  // Fetch exchange rate USD→target in parallel with stock prices
  const ratePromise = currency.toUpperCase() !== "USD"
    ? getExchangeRate("USD", currency)
    : Promise.resolve(1);

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (!res.ok) {
          log.warn({ status: res.status, symbol }, "Yahoo Finance chart API non-OK");
          result[symbol] = null;
          return;
        }
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        result[symbol] = meta?.regularMarketPrice ?? null;
      } catch (err) {
        log.error({ err, symbol }, "Yahoo Finance chart request failed");
        result[symbol] = null;
      }
    })
  );

  // Convert USD prices to target currency
  const rate = await ratePromise;
  if (rate !== 1) {
    log.info({ rate, from: "USD", to: currency }, "Converting stock prices");
    for (const symbol of symbols) {
      if (result[symbol] != null) {
        result[symbol] = Math.round(result[symbol]! * rate * 100) / 100;
      }
    }
  }

  log.info({ count: symbols.length, resolved: Object.values(result).filter((v) => v !== null).length }, "Stock prices fetched");
  return result;
}

// --- Main Entry Point ---

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
    fetchStockPrices(stockSymbols, currency),
  ]);

  return { ...cryptoPrices, ...stockPrices };
}
