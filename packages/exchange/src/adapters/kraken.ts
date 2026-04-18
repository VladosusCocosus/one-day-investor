import { createHmac, createHash } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";
import { getSymbolName, STABLECOINS } from "../symbols";

const log = createLogger("exchange:kraken");
const BASE_URL = "https://api.kraken.com";

/** Kraken uses non-standard asset codes; map the common ones. */
const KRAKEN_SYMBOL_MAP: Record<string, string> = {
  XXBT: "BTC",
  XETH: "ETH",
  XLTC: "LTC",
  XXRP: "XRP",
  XDOGE: "DOGE",
  XXLM: "XLM",
  XXMR: "XMR",
  ZUSD: "USD",
  ZEUR: "EUR",
  ZGBP: "GBP",
};

function normalizeKrakenSymbol(raw: string): string {
  if (KRAKEN_SYMBOL_MAP[raw]) return KRAKEN_SYMBOL_MAP[raw];
  // Strip leading X or Z for 4-char codes
  if (raw.length === 4 && (raw.startsWith("X") || raw.startsWith("Z"))) {
    return raw.slice(1);
  }
  return raw;
}

function sign(urlPath: string, postData: string, nonce: string, apiSecret: string): string {
  const secretBuffer = Buffer.from(apiSecret, "base64");

  const sha256Digest = createHash("sha256")
    .update(nonce + postData)
    .digest();

  const message = Buffer.concat([Buffer.from(urlPath), sha256Digest]);

  return createHmac("sha512", secretBuffer).update(message).digest("base64");
}

async function privateRequest(
  urlPath: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string> = {}
): Promise<Response> {
  const nonce = Date.now().toString();
  const postData = new URLSearchParams({ nonce, ...params }).toString();
  const signature = sign(urlPath, postData, nonce, apiSecret);

  return fetch(`${BASE_URL}${urlPath}`, {
    method: "POST",
    headers: {
      "API-Key": apiKey,
      "API-Sign": signature,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: postData,
  });
}

async function fetchUsdPrice(krakenSymbol: string, normalizedSymbol: string): Promise<number> {
  if (STABLECOINS.has(normalizedSymbol) || normalizedSymbol === "USD") return 1;
  if (normalizedSymbol === "EUR") return 1.08; // rough fallback, EUR not tradeable to USD directly here

  try {
    // Try XUSDT pair first, then ZUSD pair
    const pair = `${krakenSymbol}ZUSD`;
    const res = await fetch(`${BASE_URL}/0/public/Ticker?pair=${pair}`);
    if (res.ok) {
      const data = (await res.json()) as {
        error: string[];
        result: Record<string, { c: [string, string] }>;
      };
      if (data.error.length === 0) {
        const firstKey = Object.keys(data.result)[0];
        if (firstKey) {
          return parseFloat(data.result[firstKey].c[0]);
        }
      }
    }
  } catch (_) {
    // ignore
  }

  // Fallback: try with normalized symbol
  try {
    const res = await fetch(`${BASE_URL}/0/public/Ticker?pair=${normalizedSymbol}USD`);
    if (res.ok) {
      const data = (await res.json()) as {
        error: string[];
        result: Record<string, { c: [string, string] }>;
      };
      if (data.error.length === 0) {
        const firstKey = Object.keys(data.result)[0];
        if (firstKey) {
          return parseFloat(data.result[firstKey].c[0]);
        }
      }
    }
  } catch (_) {
    // ignore
  }

  return 0;
}

export class KrakenAdapter implements IExchangeAdapter {
  readonly exchange = "kraken" as const;

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const res = await privateRequest("/0/private/Balance", apiKey, apiSecret);
      if (!res.ok) return false;
      const data = (await res.json()) as { error: string[] };
      return data.error.length === 0;
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    // --- Spot ---
    try {
      const res = await privateRequest("/0/private/Balance", apiKey, apiSecret);
      if (!res.ok) {
        log.warn({ status: res.status }, "Spot balance fetch failed");
      } else {
        const data = (await res.json()) as {
          error: string[];
          result: Record<string, string>;
        };

        if (data.error.length > 0) {
          log.warn({ errors: data.error }, "Spot balance returned errors");
        } else {
          const nonZero = Object.entries(data.result).filter(
            ([, qty]) => parseFloat(qty) > 0
          );

          if (nonZero.length > 0) {
            const spotAssets: ExchangeAsset[] = await Promise.all(
              nonZero.map(async ([krakenSymbol, qty]) => {
                const symbol = normalizeKrakenSymbol(krakenSymbol);
                const quantity = parseFloat(qty).toString();
                const priceUsd = await fetchUsdPrice(krakenSymbol, symbol);
                const valueUsd = (parseFloat(quantity) * priceUsd).toFixed(2);

                return {
                  symbol,
                  name: getSymbolName(symbol),
                  quantity,
                  valueUsd,
                };
              })
            );

            pockets.push({
              type: "spot",
              label: "Spot",
              assets: spotAssets,
            });
          }
        }
      }
    } catch (err) {
      log.error({ err }, "fetchPockets spot failed");
    }

    // --- Earn / Staking ---
    try {
      const res = await privateRequest("/0/private/Earn/Allocations", apiKey, apiSecret);
      if (!res.ok) {
        log.warn({ status: res.status }, "Earn allocations fetch failed");
      } else {
        const data = (await res.json()) as {
          error: string[];
          result?: {
            items: Array<{
              native_asset: string;
              amount_allocated: { staking?: { total: string } };
              total_rewarded: string;
            }>;
          };
        };

        if (data.error.length === 0 && data.result?.items?.length) {
          // Merge by asset symbol
          const earnMap = new Map<string, number>();
          for (const item of data.result.items) {
            const symbol = item.native_asset;
            const qty = parseFloat(item.amount_allocated.staking?.total ?? "0");
            earnMap.set(symbol, (earnMap.get(symbol) ?? 0) + qty);
          }

          const earnAssets: ExchangeAsset[] = await Promise.all(
            Array.from(earnMap.entries()).map(async ([symbol, qty]) => {
              const priceUsd = await fetchUsdPrice(symbol, symbol);
              return {
                symbol,
                name: getSymbolName(symbol),
                quantity: qty.toString(),
                valueUsd: (qty * priceUsd).toFixed(2),
              };
            })
          );

          if (earnAssets.length > 0) {
            pockets.push({
              type: "earn",
              label: "Earn",
              assets: earnAssets,
            });
          }
        }
      }
    } catch (err) {
      log.warn({ err }, "fetchPockets earn failed (user may have no staking positions)");
    }

    return pockets;
  }
}
