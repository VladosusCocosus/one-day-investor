import { sign } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";
import { getSymbolName, STABLECOINS } from "../symbols";

const log = createLogger("exchange:revolut-x");
const BASE_URL = "https://revx.revolut.com/api/1.0";

function signRequest(
  privateKeyPem: string,
  timestamp: string,
  method: string,
  path: string,
  query?: string,
  body?: string
): string {
  const message = `${timestamp}${method}${path}${query ?? ""}${body ?? ""}`;
  const signature = sign(null, Buffer.from(message), privateKeyPem);
  return signature.toString("base64");
}

async function authedRequest(
  method: string,
  path: string,
  apiKey: string,
  privateKeyPem: string
): Promise<Response> {
  const timestamp = Date.now().toString();
  const signature = signRequest(privateKeyPem, timestamp, method, path);
  const url = `${BASE_URL}${path}`;

  return fetch(url, {
    method,
    headers: {
      "X-Revx-API-Key": apiKey,
      "X-Revx-Timestamp": timestamp,
      "X-Revx-Signature": signature,
      "Content-Type": "application/json",
    },
  });
}

interface RevolutXBalance {
  currency: string;
  available: string;
  staked: string;
}

export class RevolutXAdapter implements IExchangeAdapter {
  readonly exchange = "revolut-x" as const;

  async validateCredentials(apiKey: string, privateKeyPem: string): Promise<boolean> {
    try {
      const res = await authedRequest("GET", "/balances", apiKey, privateKeyPem);
      return res.ok;
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, privateKeyPem: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    try {
      const res = await authedRequest("GET", "/balances", apiKey, privateKeyPem);
      if (!res.ok) {
        log.warn({ status: res.status }, "Failed to fetch balances");
        return pockets;
      }

      const balances = (await res.json()) as RevolutXBalance[];

      // Fetch prices from Binance public ticker for USD valuation
      let priceMap = new Map<string, number>();
      try {
        const pricesRes = await fetch("https://api.binance.com/api/v3/ticker/price");
        if (pricesRes.ok) {
          const pricesData = (await pricesRes.json()) as Array<{ symbol: string; price: string }>;
          for (const p of pricesData) {
            priceMap.set(p.symbol, parseFloat(p.price));
          }
        }
      } catch (err) {
        log.warn({ err }, "Failed to fetch prices, USD values will be 0");
      }

      function getUsdValue(symbol: string, quantity: number): string {
        if (STABLECOINS.has(symbol)) return quantity.toFixed(2);
        const price = priceMap.get(`${symbol}USDT`) ?? 0;
        return (quantity * price).toFixed(2);
      }

      // Spot pocket: assets with available > 0
      const spotAssets: ExchangeAsset[] = balances
        .filter((b) => parseFloat(b.available) > 0)
        .map((b) => {
          const quantity = b.available;
          return {
            symbol: b.currency,
            name: getSymbolName(b.currency),
            quantity,
            valueUsd: getUsdValue(b.currency, parseFloat(quantity)),
          };
        });

      if (spotAssets.length > 0) {
        pockets.push({ type: "spot", label: "Spot", assets: spotAssets });
      }

      // Staking pocket: assets with staked > 0
      const stakingAssets: ExchangeAsset[] = balances
        .filter((b) => parseFloat(b.staked) > 0)
        .map((b) => {
          const quantity = b.staked;
          return {
            symbol: b.currency,
            name: getSymbolName(b.currency),
            quantity,
            valueUsd: getUsdValue(b.currency, parseFloat(quantity)),
          };
        });

      if (stakingAssets.length > 0) {
        pockets.push({ type: "staking", label: "Staking", assets: stakingAssets });
      }
    } catch (err) {
      log.error({ err }, "fetchPockets failed");
    }

    return pockets;
  }
}
