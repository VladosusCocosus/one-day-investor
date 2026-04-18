import { createHmac } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";
import { getSymbolName, STABLECOINS } from "../symbols";

const log = createLogger("exchange:coinbase");
const BASE_URL = "https://api.coinbase.com";

const FIAT_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "HKD", "SGD"]);

function sign(timestamp: string, method: string, path: string, body: string, secret: string): string {
  const message = timestamp + method + path + body;
  return createHmac("sha256", secret).update(message).digest("hex");
}

async function signedRequest(
  method: string,
  path: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string> = {}
): Promise<Response> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  const fullPath = queryString ? `${path}?${queryString}` : path;
  const body = "";
  const signature = sign(timestamp, method, fullPath, body, apiSecret);
  const url = `${BASE_URL}${fullPath}`;

  return fetch(url, {
    method,
    headers: {
      "CB-ACCESS-KEY": apiKey,
      "CB-ACCESS-SIGN": signature,
      "CB-ACCESS-TIMESTAMP": timestamp,
      "CB-VERSION": "2024-01-01",
      "Content-Type": "application/json",
    },
  });
}

type CoinbaseAccount = {
  uuid: string;
  name: string;
  currency: string;
  available_balance: { value: string; currency: string };
  hold: { value: string };
};

type AccountsResponse = {
  accounts: CoinbaseAccount[];
  has_next: boolean;
  cursor: string;
};

async function fetchAllAccounts(apiKey: string, apiSecret: string): Promise<CoinbaseAccount[]> {
  const allAccounts: CoinbaseAccount[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, string> = { limit: "250" };
    if (cursor) params.cursor = cursor;

    const res = await signedRequest("GET", "/api/v3/brokerage/accounts", apiKey, apiSecret, params);
    if (!res.ok) {
      log.warn({ status: res.status }, "Failed to fetch accounts page");
      break;
    }

    const data = (await res.json()) as AccountsResponse;
    allAccounts.push(...data.accounts);

    if (data.has_next && data.cursor) {
      cursor = data.cursor;
    } else {
      cursor = undefined;
    }
  } while (cursor);

  return allAccounts;
}

export class CoinbaseAdapter implements IExchangeAdapter {
  readonly exchange = "coinbase" as const;

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const res = await signedRequest("GET", "/api/v3/brokerage/accounts", apiKey, apiSecret, {
        limit: "1",
      });
      return res.ok;
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    try {
      const accounts = await fetchAllAccounts(apiKey, apiSecret);

      const nonZeroAccounts = accounts.filter((a) => {
        const available = parseFloat(a.available_balance.value);
        const held = parseFloat(a.hold.value);
        return available + held > 0 && !FIAT_CURRENCIES.has(a.currency);
      });

      if (nonZeroAccounts.length === 0) {
        return pockets;
      }

      // Fetch prices from Binance public ticker
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
        log.warn({ err }, "Failed to fetch prices from Binance, USD values will be 0");
      }

      const spotAssets: ExchangeAsset[] = nonZeroAccounts.map((a) => {
        const quantity = (parseFloat(a.available_balance.value) + parseFloat(a.hold.value)).toString();
        const symbol = a.currency;

        let priceUsd: number;
        if (STABLECOINS.has(symbol)) {
          priceUsd = 1;
        } else {
          priceUsd = priceMap.get(`${symbol}USDT`) ?? 0;
        }

        const valueUsd = (parseFloat(quantity) * priceUsd).toFixed(2);

        return {
          symbol,
          name: getSymbolName(symbol),
          quantity,
          valueUsd,
        };
      });

      pockets.push({
        type: "spot",
        label: "Spot",
        assets: spotAssets,
      });
    } catch (err) {
      log.error({ err }, "fetchPockets failed");
    }

    return pockets;
  }
}
