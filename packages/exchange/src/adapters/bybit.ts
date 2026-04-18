import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";

const log = createLogger("exchange:bybit");

const BASE_URL = "https://api.bybit.com";
const RECV_WINDOW = "5000";

const SYMBOL_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "XRP",
  ADA: "Cardano",
  DOGE: "Dogecoin",
  DOT: "Polkadot",
  MATIC: "Polygon",
  LTC: "Litecoin",
  AVAX: "Avalanche",
  LINK: "Chainlink",
  UNI: "Uniswap",
  ATOM: "Cosmos",
  XLM: "Stellar",
  ALGO: "Algorand",
  FIL: "Filecoin",
  TRX: "TRON",
  ETC: "Ethereum Classic",
  NEAR: "NEAR Protocol",
  APT: "Aptos",
  ARB: "Arbitrum",
  OP: "Optimism",
  INJ: "Injective",
  SUI: "Sui",
  USDT: "Tether",
  USDC: "USD Coin",
  BUSD: "Binance USD",
  DAI: "Dai",
  TUSD: "TrueUSD",
};

function getSymbolName(symbol: string): string {
  return SYMBOL_NAMES[symbol] ?? symbol;
}

async function signedRequest(
  apiKey: string,
  apiSecret: string,
  path: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const timestamp = Date.now().toString();
  const queryString = new URLSearchParams(params).toString();
  const signPayload = `${timestamp}${apiKey}${RECV_WINDOW}${queryString}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const msgData = encoder.encode(signPayload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const url = `${BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: {
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-SIGN": sigHex,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": RECV_WINDOW,
    },
  });

  if (!response.ok) {
    throw new Error(`Bybit HTTP error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export class BybitAdapter implements IExchangeAdapter {
  readonly exchange = "bybit" as const;

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const data = (await signedRequest(apiKey, apiSecret, "/v5/account/wallet-balance", {
        accountType: "UNIFIED",
      })) as { retCode: number };

      const valid = data.retCode === 0;
      log.info({ valid }, "validateCredentials");
      return valid;
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    // Spot (UNIFIED wallet)
    try {
      const data = (await signedRequest(apiKey, apiSecret, "/v5/account/wallet-balance", {
        accountType: "UNIFIED",
      })) as {
        retCode: number;
        result: {
          list: Array<{
            coin: Array<{
              coin: string;
              walletBalance: string;
              usdValue: string;
            }>;
          }>;
        };
      };

      if (data.retCode === 0) {
        const assets: ExchangeAsset[] = [];

        for (const account of data.result.list) {
          for (const coin of account.coin) {
            const balance = parseFloat(coin.walletBalance);
            if (balance > 0) {
              assets.push({
                symbol: coin.coin,
                name: getSymbolName(coin.coin),
                quantity: coin.walletBalance,
                valueUsd: coin.usdValue,
              });
            }
          }
        }

        pockets.push({ type: "spot", label: "Spot", assets });
        log.info({ count: assets.length }, "fetched spot assets");
      }
    } catch (err) {
      log.error({ err }, "fetchPockets spot failed");
    }

    // Earn
    try {
      const data = (await signedRequest(apiKey, apiSecret, "/v5/earn/position")) as {
        retCode: number;
        result: {
          list: Array<{
            coin: string;
            quantity: string;
            usdValue: string;
          }>;
        };
      };

      if (data.retCode === 0) {
        const assets: ExchangeAsset[] = data.result.list.map((item) => ({
          symbol: item.coin,
          name: getSymbolName(item.coin),
          quantity: item.quantity,
          valueUsd: item.usdValue,
        }));

        pockets.push({ type: "earn", label: "Earn", assets });
        log.info({ count: assets.length }, "fetched earn assets");
      }
    } catch (err) {
      log.warn({ err }, "fetchPockets earn skipped");
    }

    // Futures (linear USDT-settled)
    try {
      const data = (await signedRequest(apiKey, apiSecret, "/v5/position/list", {
        category: "linear",
        settleCoin: "USDT",
      })) as {
        retCode: number;
        result: {
          list: Array<{
            positionValue: string;
            unrealisedPnl: string;
          }>;
        };
      };

      if (data.retCode === 0 && data.result.list.length > 0) {
        const total = data.result.list.reduce((sum, pos) => {
          return sum + parseFloat(pos.positionValue) + parseFloat(pos.unrealisedPnl);
        }, 0);

        const assets: ExchangeAsset[] = [
          {
            symbol: "FUTURES",
            name: "Futures Positions",
            quantity: "1",
            valueUsd: total.toString(),
          },
        ];

        pockets.push({ type: "futures", label: "Futures", assets });
        log.info({ total }, "fetched futures positions");
      }
    } catch (err) {
      log.warn({ err }, "fetchPockets futures skipped");
    }

    return pockets;
  }
}
