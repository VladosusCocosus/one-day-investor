import { createHmac } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";
import { getSymbolName, STABLECOINS } from "../symbols";

const log = createLogger("exchange:kucoin");
const BASE_URL = "https://api.kucoin.com";

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64");
}

async function signedRequest(
  apiKey: string,
  apiSecret: string,
  method: string,
  path: string,
  body = ""
): Promise<unknown> {
  const colonIdx = apiSecret.indexOf(":");
  const secret = colonIdx !== -1 ? apiSecret.slice(0, colonIdx) : apiSecret;
  const passphrase = colonIdx !== -1 ? apiSecret.slice(colonIdx + 1) : "";

  const timestamp = Date.now().toString();
  const signStr = timestamp + method.toUpperCase() + path + body;
  const sign = signPayload(signStr, secret);
  const signedPassphrase = signPayload(passphrase, secret);

  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers: {
      "KC-API-KEY": apiKey,
      "KC-API-SIGN": sign,
      "KC-API-TIMESTAMP": timestamp,
      "KC-API-PASSPHRASE": signedPassphrase,
      "KC-API-KEY-VERSION": "2",
      "Content-Type": "application/json",
    },
    body: body || undefined,
  });

  if (!response.ok) {
    throw new Error(`KuCoin HTTP error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchPrices(): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  try {
    const res = await fetch(`${BASE_URL}/api/v1/prices`);
    if (res.ok) {
      const data = (await res.json()) as { code: string; data: Record<string, string> };
      if (data.code === "200000" && data.data) {
        for (const [symbol, price] of Object.entries(data.data)) {
          priceMap.set(symbol, parseFloat(price));
        }
      }
    }
  } catch (err) {
    log.warn({ err }, "fetchPrices failed");
  }
  return priceMap;
}

function buildAssets(
  balances: Array<{ currency: string; balance: string; available: string; holds: string }>,
  priceMap: Map<string, number>
): ExchangeAsset[] {
  return balances
    .filter((b) => parseFloat(b.balance) > 0)
    .map((b) => {
      const qty = parseFloat(b.balance);
      let priceUsd: number;
      if (STABLECOINS.has(b.currency)) {
        priceUsd = 1;
      } else {
        priceUsd = priceMap.get(b.currency) ?? 0;
      }
      return {
        symbol: b.currency,
        name: getSymbolName(b.currency),
        quantity: b.balance,
        valueUsd: (qty * priceUsd).toFixed(2),
      };
    });
}

export class KucoinAdapter implements IExchangeAdapter {
  readonly exchange = "kucoin" as const;

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const data = (await signedRequest(
        apiKey,
        apiSecret,
        "GET",
        "/api/v1/accounts"
      )) as { code: string };

      const valid = data.code === "200000";
      log.info({ valid }, "validateCredentials");
      return valid;
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    const priceMap = await fetchPrices();

    // --- Spot (trade account) ---
    try {
      const data = (await signedRequest(
        apiKey,
        apiSecret,
        "GET",
        "/api/v1/accounts?type=trade"
      )) as {
        code: string;
        data: Array<{ currency: string; balance: string; available: string; holds: string }>;
      };

      if (data.code === "200000" && Array.isArray(data.data)) {
        const assets = buildAssets(data.data, priceMap);
        pockets.push({ type: "spot", label: "Spot", assets });
        log.info({ count: assets.length }, "fetched spot assets");
      }
    } catch (err) {
      log.error({ err }, "fetchPockets spot failed");
    }

    // --- Main account ---
    try {
      const data = (await signedRequest(
        apiKey,
        apiSecret,
        "GET",
        "/api/v1/accounts?type=main"
      )) as {
        code: string;
        data: Array<{ currency: string; balance: string; available: string; holds: string }>;
      };

      if (data.code === "200000" && Array.isArray(data.data)) {
        const assets = buildAssets(data.data, priceMap);
        if (assets.length > 0) {
          pockets.push({ type: "main", label: "Main", assets });
          log.info({ count: assets.length }, "fetched main assets");
        }
      }
    } catch (err) {
      log.error({ err }, "fetchPockets main failed");
    }

    // --- Earn ---
    try {
      const data = (await signedRequest(
        apiKey,
        apiSecret,
        "GET",
        "/api/v1/earn/orders?status=RUNNING"
      )) as {
        code: string;
        data: {
          items: Array<{
            currency: string;
            holdAmount: string;
            currentInterestAmount?: string;
          }>;
        };
      };

      if (data.code === "200000" && data.data?.items?.length > 0) {
        const earnMap = new Map<string, number>();
        for (const item of data.data.items) {
          const qty = parseFloat(item.holdAmount ?? "0");
          earnMap.set(item.currency, (earnMap.get(item.currency) ?? 0) + qty);
        }

        const earnAssets: ExchangeAsset[] = Array.from(earnMap.entries()).map(
          ([currency, qty]) => {
            let priceUsd: number;
            if (STABLECOINS.has(currency)) {
              priceUsd = 1;
            } else {
              priceUsd = priceMap.get(currency) ?? 0;
            }
            return {
              symbol: currency,
              name: getSymbolName(currency),
              quantity: qty.toString(),
              valueUsd: (qty * priceUsd).toFixed(2),
            };
          }
        );

        pockets.push({ type: "earn", label: "Earn", assets: earnAssets });
        log.info({ count: earnAssets.length }, "fetched earn assets");
      }
    } catch (err) {
      log.warn({ err }, "fetchPockets earn skipped");
    }

    return pockets;
  }
}
