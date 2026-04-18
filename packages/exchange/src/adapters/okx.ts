import { createHmac } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";
import { getSymbolName, STABLECOINS } from "../symbols";

const log = createLogger("exchange:okx");
const BASE_URL = "https://www.okx.com";

function parseCredentials(apiSecret: string): { secret: string; passphrase: string } {
  const idx = apiSecret.indexOf(":");
  if (idx === -1) {
    return { secret: apiSecret, passphrase: "" };
  }
  return {
    secret: apiSecret.slice(0, idx),
    passphrase: apiSecret.slice(idx + 1),
  };
}

function sign(timestamp: string, method: string, path: string, body: string, secret: string): string {
  const payload = `${timestamp}${method}${path}${body}`;
  return createHmac("sha256", secret).update(payload).digest("base64");
}

async function signedRequest(
  apiKey: string,
  apiSecret: string,
  method: "GET" | "POST",
  path: string,
  body = ""
): Promise<unknown> {
  const { secret, passphrase } = parseCredentials(apiSecret);
  const timestamp = new Date().toISOString();
  const signature = sign(timestamp, method, path, body, secret);

  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
      "Content-Type": "application/json",
    },
    ...(body ? { body } : {}),
  });

  if (!response.ok) {
    throw new Error(`OKX HTTP error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export class OkxAdapter implements IExchangeAdapter {
  readonly exchange = "okx" as const;

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const data = (await signedRequest(apiKey, apiSecret, "GET", "/api/v5/account/balance")) as {
        code: string;
      };
      const valid = data.code === "0";
      log.info({ valid }, "validateCredentials");
      return valid;
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    // --- Trading account ---
    // Also collect a price map from eqUsd for use in funding account valuation
    const tradingPriceMap = new Map<string, number>();

    try {
      const data = (await signedRequest(apiKey, apiSecret, "GET", "/api/v5/account/balance")) as {
        code: string;
        data: Array<{
          details: Array<{
            ccy: string;
            availBal: string;
            frozenBal: string;
            eqUsd: string;
          }>;
        }>;
      };

      if (data.code === "0") {
        const assets: ExchangeAsset[] = [];

        for (const account of data.data) {
          for (const detail of account.details) {
            const total = parseFloat(detail.availBal) + parseFloat(detail.frozenBal);
            if (total > 0) {
              assets.push({
                symbol: detail.ccy,
                name: getSymbolName(detail.ccy),
                quantity: total.toString(),
                valueUsd: detail.eqUsd,
              });

              // Build price map for funding valuation
              const qty = parseFloat(detail.availBal) + parseFloat(detail.frozenBal);
              const usd = parseFloat(detail.eqUsd);
              if (qty > 0 && usd > 0) {
                tradingPriceMap.set(detail.ccy, usd / qty);
              }
            }
          }
        }

        pockets.push({ type: "spot", label: "Trading", assets });
        log.info({ count: assets.length }, "fetched trading assets");
      }
    } catch (err) {
      log.error({ err }, "fetchPockets trading failed");
    }

    // --- Funding account ---
    try {
      const data = (await signedRequest(apiKey, apiSecret, "GET", "/api/v5/asset/balances")) as {
        code: string;
        data: Array<{
          ccy: string;
          bal: string;
          availBal: string;
        }>;
      };

      if (data.code === "0" && data.data.length > 0) {
        const assets: ExchangeAsset[] = [];

        for (const item of data.data) {
          const qty = parseFloat(item.bal);
          if (qty <= 0) continue;

          let priceUsd: number;
          if (STABLECOINS.has(item.ccy)) {
            priceUsd = 1;
          } else {
            priceUsd = tradingPriceMap.get(item.ccy) ?? 0;
          }

          assets.push({
            symbol: item.ccy,
            name: getSymbolName(item.ccy),
            quantity: item.bal,
            valueUsd: (qty * priceUsd).toFixed(2),
          });
        }

        if (assets.length > 0) {
          pockets.push({ type: "funding", label: "Funding", assets });
          log.info({ count: assets.length }, "fetched funding assets");
        }
      }
    } catch (err) {
      log.warn({ err }, "fetchPockets funding skipped");
    }

    // --- Earn (savings) ---
    try {
      const data = (await signedRequest(
        apiKey,
        apiSecret,
        "GET",
        "/api/v5/finance/savings/balance"
      )) as {
        code: string;
        data: Array<{
          ccy: string;
          amt: string;
          earnings: string;
        }>;
      };

      if (data.code === "0" && data.data.length > 0) {
        const assets: ExchangeAsset[] = [];

        for (const item of data.data) {
          const qty = parseFloat(item.amt);
          if (qty <= 0) continue;

          let priceUsd: number;
          if (STABLECOINS.has(item.ccy)) {
            priceUsd = 1;
          } else {
            priceUsd = tradingPriceMap.get(item.ccy) ?? 0;
          }

          assets.push({
            symbol: item.ccy,
            name: getSymbolName(item.ccy),
            quantity: item.amt,
            valueUsd: (qty * priceUsd).toFixed(2),
          });
        }

        if (assets.length > 0) {
          pockets.push({ type: "earn", label: "Earn", assets });
          log.info({ count: assets.length }, "fetched earn assets");
        }
      }
    } catch (err) {
      log.warn({ err }, "fetchPockets earn skipped");
    }

    return pockets;
  }
}
