import { sign } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";
import { getSymbolName, STABLECOINS } from "../symbols";

const log = createLogger("exchange:revolut-x");
const BASE = "https://revx.revolut.com";
const API_PREFIX = "/api/1.0";

/** Normalize private key input — accept full PEM or raw base64 */
function normalizePem(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("-----BEGIN")) return trimmed;
  // Raw base64 — wrap in PEM envelope
  const base64 = trimmed.replace(/\s+/g, "");
  return `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
}

function signRequest(
  privateKeyPem: string,
  timestamp: string,
  method: string,
  fullPath: string,
  query?: string,
  body?: string
): string {
  // Revolut X requires signing the path starting from /api (e.g. /api/1.0/balances)
  const message = `${timestamp}${method}${fullPath}${query ?? ""}${body ?? ""}`;
  const signature = sign(null, Buffer.from(message), privateKeyPem);
  return signature.toString("base64");
}

async function authedRequest(
  method: string,
  path: string,
  apiKey: string,
  privateKeyPem: string
): Promise<Response> {
  const fullPath = `${API_PREFIX}${path}`;
  const timestamp = Date.now().toString();
  const signature = signRequest(privateKeyPem, timestamp, method, fullPath);
  const url = `${BASE}${fullPath}`;

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
      const pem = normalizePem(privateKeyPem);
      log.info({ keyLength: apiKey.length, pemLines: pem.split("\n").length }, "validateCredentials: attempting");
      const res = await authedRequest("GET", "/balances", apiKey, pem);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        log.warn({ status: res.status, body }, "validateCredentials: rejected by Revolut");
      }
      return res.ok;
    } catch (err) {
      log.error({ err }, "validateCredentials: exception");
      return false;
    }
  }

  async fetchPockets(apiKey: string, privateKeyPem: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    try {
      const pem = normalizePem(privateKeyPem);
      const res = await authedRequest("GET", "/balances", apiKey, pem);
      if (!res.ok) {
        log.warn({ status: res.status, body: await res.text().catch(() => "") }, "Failed to fetch balances");
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
