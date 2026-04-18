import { createHmac } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";
import { getSymbolName, STABLECOINS } from "../symbols";

const log = createLogger("exchange:bitfinex");
const BASE_URL = "https://api.bitfinex.com";

/** Bitfinex uses non-standard currency codes; map the common ones. */
const BITFINEX_SYMBOL_MAP: Record<string, string> = {
  UST: "USDT",
  UDC: "USDC",
  MNA: "MANA",
  DAT: "DATA",
  ORS: "ORSGROUP",
};

function normalizeBitfinexSymbol(raw: string): string {
  // Strip leading 't' from trading pairs if present (e.g., tBTC → BTC)
  const cleaned = raw.startsWith("t") && raw.length > 1 ? raw.slice(1) : raw;
  return BITFINEX_SYMBOL_MAP[cleaned] ?? cleaned;
}

function sign(path: string, nonce: string, body: string, apiSecret: string): string {
  const signPayload = `/api/v2/${path}${nonce}${body}`;
  return createHmac("sha384", apiSecret).update(signPayload).digest("hex");
}

async function privateRequest(
  path: string,
  apiKey: string,
  apiSecret: string,
  body: Record<string, unknown> = {}
): Promise<Response> {
  const nonce = (Date.now() * 1000).toString();
  const bodyStr = JSON.stringify(body);
  const signature = sign(path, nonce, bodyStr, apiSecret);

  return fetch(`${BASE_URL}/v2/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "bfx-nonce": nonce,
      "bfx-apikey": apiKey,
      "bfx-signature": signature,
    },
    body: bodyStr,
  });
}

async function fetchUsdPrices(symbols: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();

  const toFetch = symbols.filter((s) => !STABLECOINS.has(s) && s !== "USD");
  if (toFetch.length === 0) return priceMap;

  try {
    const tickerSymbols = toFetch.map((s) => `t${s}USD`).join(",");
    const res = await fetch(`${BASE_URL}/v2/tickers?symbols=${tickerSymbols}`);
    if (res.ok) {
      const data = (await res.json()) as Array<[string, ...number[]]>;
      for (const ticker of data) {
        // ticker[0] = SYMBOL (e.g., "tBTCUSD"), ticker[7] = LAST_PRICE
        const rawSymbol = ticker[0];
        const lastPrice = ticker[7];
        if (rawSymbol && typeof lastPrice === "number") {
          // Strip leading 't' and trailing 'USD'
          const asset = rawSymbol.slice(1, -3);
          priceMap.set(asset, lastPrice);
        }
      }
    }
  } catch (err) {
    log.warn({ err }, "fetchUsdPrices via Bitfinex tickers failed");
  }

  return priceMap;
}

export class BitfinexAdapter implements IExchangeAdapter {
  readonly exchange = "bitfinex" as const;

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const res = await privateRequest("auth/r/wallets", apiKey, apiSecret, {});
      if (!res.ok) return false;
      const data = await res.json();
      // Valid response is an array; error response is an object like { message: "...", error: "..." }
      return Array.isArray(data);
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    try {
      const res = await privateRequest("auth/r/wallets", apiKey, apiSecret, {});
      if (!res.ok) {
        log.warn({ status: res.status }, "Wallets fetch failed");
        return pockets;
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        log.warn({ data }, "Wallets response is not an array");
        return pockets;
      }

      // Each wallet: [WALLET_TYPE, CURRENCY, BALANCE, UNSETTLED_INTEREST, AVAILABLE_BALANCE, ...]
      type WalletEntry = [string, string, number, number, number, ...unknown[]];
      const wallets = data as WalletEntry[];

      // Group non-zero balances by wallet type
      const grouped = new Map<string, Array<{ currency: string; balance: number }>>();
      for (const wallet of wallets) {
        const [walletType, currency, balance] = wallet;
        if (!balance || balance <= 0) continue;

        const normalizedType = walletType.toLowerCase();
        if (!grouped.has(normalizedType)) {
          grouped.set(normalizedType, []);
        }
        grouped.get(normalizedType)!.push({ currency, balance });
      }

      // Collect all unique normalized symbols to fetch prices in one call
      const allSymbols = new Set<string>();
      for (const entries of grouped.values()) {
        for (const { currency } of entries) {
          allSymbols.add(normalizeBitfinexSymbol(currency));
        }
      }

      const priceMap = await fetchUsdPrices(Array.from(allSymbols));

      const getUsdPrice = (symbol: string): number => {
        if (STABLECOINS.has(symbol) || symbol === "USD") return 1;
        return priceMap.get(symbol) ?? 0;
      };

      const buildAssets = (entries: Array<{ currency: string; balance: number }>): ExchangeAsset[] => {
        return entries.map(({ currency, balance }) => {
          const symbol = normalizeBitfinexSymbol(currency);
          const priceUsd = getUsdPrice(symbol);
          return {
            symbol,
            name: getSymbolName(symbol),
            quantity: balance.toString(),
            valueUsd: (balance * priceUsd).toFixed(2),
          };
        });
      };

      // Map wallet types to pocket labels
      const WALLET_TYPE_MAP: Record<string, { type: string; label: string }> = {
        exchange: { type: "spot", label: "Spot" },
        margin: { type: "margin", label: "Margin" },
        funding: { type: "funding", label: "Funding" },
      };

      for (const [walletType, entries] of grouped.entries()) {
        const pocketInfo = WALLET_TYPE_MAP[walletType] ?? { type: walletType, label: walletType.charAt(0).toUpperCase() + walletType.slice(1) };
        const assets = buildAssets(entries);

        if (assets.length > 0) {
          pockets.push({
            type: pocketInfo.type,
            label: pocketInfo.label,
            assets,
          });
        }
      }
    } catch (err) {
      log.error({ err }, "fetchPockets failed");
    }

    return pockets;
  }
}
