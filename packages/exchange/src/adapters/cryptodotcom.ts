import { createHmac } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";
import { getSymbolName, STABLECOINS } from "../symbols";

const log = createLogger("exchange:crypto.com");
const BASE_URL = "https://api.crypto.com/exchange/v1";

function sign(
  method: string,
  id: number,
  apiKey: string,
  params: Record<string, unknown>,
  nonce: number,
  apiSecret: string
): string {
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  const payload = `${method}${id}${apiKey}${paramString}${nonce}`;
  return createHmac("sha256", apiSecret).update(payload).digest("hex");
}

async function signedRequest(
  apiKey: string,
  apiSecret: string,
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const nonce = Date.now();
  const id = nonce;

  const sig = sign(method, id, apiKey, params, nonce, apiSecret);

  const body = JSON.stringify({
    id,
    method,
    api_key: apiKey,
    params,
    nonce,
    sig,
  });

  const url = `${BASE_URL}/${method}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Crypto.com HTTP error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchUsdPrices(): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  try {
    const response = await fetch(`${BASE_URL}/public/get-tickers`);
    if (!response.ok) return priceMap;

    const data = (await response.json()) as {
      result?: { data?: Array<{ i: string; a: string }> };
    };

    for (const ticker of data?.result?.data ?? []) {
      // instrument name format: BTC_USDT
      const parts = ticker.i.split("_");
      if (parts.length === 2 && parts[1] === "USDT") {
        const price = parseFloat(ticker.a);
        if (!isNaN(price) && price > 0) {
          priceMap.set(parts[0], price);
        }
      }
    }
  } catch (err) {
    log.warn({ err }, "fetchUsdPrices failed");
  }
  return priceMap;
}

export class CryptoDotComAdapter implements IExchangeAdapter {
  readonly exchange = "crypto.com" as const;

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const data = (await signedRequest(apiKey, apiSecret, "private/get-accounts")) as {
        code: number;
      };
      const valid = data.code === 0;
      log.info({ valid }, "validateCredentials");
      return valid;
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    try {
      const data = (await signedRequest(apiKey, apiSecret, "private/get-accounts")) as {
        code: number;
        result?: {
          data?: Array<{
            currency: string;
            balance: number;
            available: number;
            order: number;
            stake: number;
          }>;
        };
      };

      if (data.code === 0) {
        const nonZeroItems = (data.result?.data ?? []).filter((item) => item.balance > 0);

        const priceMap = await fetchUsdPrices();

        const assets: ExchangeAsset[] = [];

        for (const item of nonZeroItems) {
          const symbol = item.currency;
          let priceUsd: number;

          if (STABLECOINS.has(symbol)) {
            priceUsd = 1;
          } else {
            priceUsd = priceMap.get(symbol) ?? 0;
          }

          const valueUsd = (item.balance * priceUsd).toFixed(2);

          assets.push({
            symbol,
            name: getSymbolName(symbol),
            quantity: item.balance.toString(),
            valueUsd,
          });
        }

        pockets.push({ type: "spot", label: "Spot", assets });
        log.info({ count: assets.length }, "fetched spot assets");
      }
    } catch (err) {
      log.error({ err }, "fetchPockets spot failed");
    }

    return pockets;
  }
}
