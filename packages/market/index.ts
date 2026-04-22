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

// --- CoinGecko api_id → symbol mapping ---
// Used to match CoinGecko ids to Binance/Bybit ticker symbols

const COINGECKO_TO_SYMBOL: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  binancecoin: "BNB",
  ripple: "XRP",
  cardano: "ADA",
  dogecoin: "DOGE",
  polkadot: "DOT",
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  "matic-network": "MATIC",
  uniswap: "UNI",
  litecoin: "LTC",
  cosmos: "ATOM",
  near: "NEAR",
  stellar: "XLM",
  algorand: "ALGO",
  "the-open-network": "TON",
  tron: "TRX",
  sui: "SUI",
};

// --- Exchange Ticker Prices (Binance — public, no auth, USD via USDT pairs) ---

interface TickerCache {
  prices: Map<string, number>; // symbol → USD price
  fetchedAt: number;
}

const TICKER_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
let tickerCache: TickerCache | null = null;

const STABLECOINS = new Set(["USDT", "USDC", "BUSD", "FDUSD", "DAI", "TUSD"]);

async function fetchExchangeTickers(): Promise<Map<string, number>> {
  // Return cached if fresh
  if (tickerCache && Date.now() - tickerCache.fetchedAt < TICKER_CACHE_TTL) {
    log.debug({ count: tickerCache.prices.size }, "Exchange ticker cache hit");
    return tickerCache.prices;
  }

  const prices = new Map<string, number>();

  // Stablecoins are always ~$1
  for (const stable of STABLECOINS) {
    prices.set(stable, 1);
  }

  // Try Binance first (single call gets ALL pairs)
  try {
    log.info("Fetching all ticker prices from Binance");
    const res = await fetch("https://api.binance.com/api/v3/ticker/price");
    if (res.ok) {
      const tickers = (await res.json()) as { symbol: string; price: string }[];
      for (const t of tickers) {
        if (t.symbol.endsWith("USDT")) {
          const symbol = t.symbol.replace("USDT", "");
          if (!STABLECOINS.has(symbol)) {
            prices.set(symbol, parseFloat(t.price));
          }
        }
      }
      log.info({ count: prices.size }, "Binance ticker prices loaded");
    } else {
      log.warn({ status: res.status }, "Binance ticker API non-OK, trying Bybit");
    }
  } catch (err) {
    log.warn({ err }, "Binance ticker fetch failed, trying Bybit");
  }

  // If Binance failed or returned very few results, try Bybit as backup
  if (prices.size <= STABLECOINS.size) {
    try {
      log.info("Fetching ticker prices from Bybit");
      const res = await fetch("https://api.bybit.com/v5/market/tickers?category=spot");
      if (res.ok) {
        const data = (await res.json()) as {
          retCode: number;
          result: { list: { symbol: string; lastPrice: string }[] };
        };
        if (data.retCode === 0) {
          for (const t of data.result.list) {
            if (t.symbol.endsWith("USDT")) {
              const symbol = t.symbol.replace("USDT", "");
              if (!prices.has(symbol) && !STABLECOINS.has(symbol)) {
                prices.set(symbol, parseFloat(t.lastPrice));
              }
            }
          }
          log.info({ count: prices.size }, "Bybit ticker prices loaded");
        }
      }
    } catch (err) {
      log.warn({ err }, "Bybit ticker fetch also failed");
    }
  }

  if (prices.size > STABLECOINS.size) {
    tickerCache = { prices, fetchedAt: Date.now() };
  }

  return prices;
}

// --- Crypto Prices (Exchange tickers first, CoinGecko fallback) ---

export async function fetchCryptoPrices(
  assets: { api_id: string; symbol?: string }[],
  currency: string
): Promise<Record<string, number | null>> {
  if (assets.length === 0) return {};

  const result: Record<string, number | null> = {};

  // 1. Try exchange tickers (Binance/Bybit — returns USD prices)
  const tickers = await fetchExchangeTickers();

  console.log({
      assets
  })

  console.log({
      tickers: tickers
  })

  const unresolvedAssets: { api_id: string; symbol?: string }[] = [];

  for (const asset of assets) {
    const id = asset.api_id;
    // Try the actual ticker symbol first (most reliable — "SFP", "BTC", etc.)
    if (asset.symbol && tickers.has(asset.symbol)) {
      console.log("found [Binance]", { id, result: tickers.get(asset.symbol) })
      result[id] = tickers.get(asset.symbol)!;
      continue;
    }
    // Then try known CoinGecko→symbol mapping
    const mapped = COINGECKO_TO_SYMBOL[id];
    if (mapped && tickers.has(mapped)) {
      console.log("found [CoinGecko]", { id, mapped })
      result[id] = tickers.get(mapped)!;
      continue;
    }
    // Try uppercase api_id as symbol
    const upperId = id.toUpperCase();
    if (tickers.has(upperId)) {
      console.log("found [Binance] Upper Case", { id, result: tickers.get(upperId) })
      result[id] = tickers.get(upperId)!;
      continue;
    }
    unresolvedAssets.push(asset);
  }

  const unresolvedIds = unresolvedAssets.map((a) => a.api_id);

  if (unresolvedIds.length > 0) {
    log.info(
      { resolved: assets.length - unresolvedIds.length, unresolved: unresolvedIds, },
      "Exchange tickers resolved some, falling back to CoinGecko for rest"
    );
  } else {
    log.info({ count: assets.length }, "All crypto prices resolved from exchange tickers");
  }

  // 2. Fallback to CoinGecko for anything not found
  if (unresolvedIds.length > 0) {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${unresolvedIds.join(",")}&vs_currencies=usd`;
      log.info({ ids: unresolvedIds }, "Fetching remaining prices from CoinGecko");
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        for (const id of unresolvedIds) {
          result[id] = data[id]?.usd ?? null;
        }
      } else {
        log.warn({ status: res.status }, "CoinGecko API returned non-OK status");
        for (const id of unresolvedIds) result[id] = null;
      }
    } catch (err) {
      log.error({ err }, "CoinGecko API request failed");
      for (const id of unresolvedIds) result[id] = null;
    }
  }

  // 3. Convert from USD to target currency if needed
  if (currency.toUpperCase() !== "USD") {
    const rate = await getExchangeRate("USD", currency);
    for (const id of Object.keys(result)) {
      if (result[id] != null) {
        result[id] = Math.round(result[id]! * rate * 100) / 100;
      }
    }
  }

  return result;
}

// --- Stock Prices (Yahoo Finance — returns in native currency, converted to target) ---

export async function fetchStockPrices(
  symbols: string[],
  currency: string
): Promise<Record<string, number | null>> {
  if (symbols.length === 0) return {};
  const result: Record<string, { price: number; currency: string } | null> = {};

  log.info({ symbols, currency }, "Fetching stock prices from Yahoo Finance v8 chart");

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
        result[symbol] = {
          price: meta?.regularMarketPrice ?? null,
          currency: meta.currency,
        };
      } catch (err) {
        log.error({ err, symbol }, "Yahoo Finance chart request failed");
        result[symbol] = null;
      }
    })
  );

  // Convert to target currency
  for (const symbol of Object.keys(result)) {
    if (result[symbol] != null) {
      const rate = await getExchangeRate(result[symbol]!.currency, currency);
      result[symbol] = {
        ...result[symbol]!,
        price: Math.round(result[symbol]!.price * rate * 100) / 100,
      };
    }
  }

  log.info(
    { count: symbols.length, resolved: Object.values(result).filter((v) => v !== null).length },
    "Stock prices fetched"
  );
  return Object.keys(result).reduce<Record<string, number | null>>((acc, key) => {
    acc[key] = result[key]?.price ?? null;
    return acc;
  }, {});
}

// --- Main Entry Point ---

export async function fetchPrices(
  assets: { api_id: string; symbol?: string; asset_type: AssetType }[],
  currency: string
): Promise<Record<string, number | null>> {
  const cryptoAssets = assets.filter((a) => a.asset_type === "crypto");
  const stockSymbols = assets
    .filter((a) => a.asset_type === "invest")
    .map((a) => a.api_id);

  log.info({ cryptoCount: cryptoAssets.length, stockCount: stockSymbols.length, currency }, "Fetching all prices");

  const [cryptoPrices, stockPrices] = await Promise.all([
    fetchCryptoPrices(cryptoAssets, currency),
    fetchStockPrices(stockSymbols, currency),
  ]);

  return { ...cryptoPrices, ...stockPrices };
}
