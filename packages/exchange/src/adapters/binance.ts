import { createHmac } from "crypto";
import { createLogger } from "@logger";
import type { ExchangeAsset, ExchangePocket, IExchangeAdapter } from "../types";

const log = createLogger("exchange:binance");

const BASE_URL = "https://api.binance.com";

const STABLECOINS = new Set(["USDT", "USDC", "BUSD", "FDUSD", "DAI"]);

const SYMBOL_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "XRP",
  ADA: "Cardano",
  DOGE: "Dogecoin",
  AVAX: "Avalanche",
  DOT: "Polkadot",
  MATIC: "Polygon",
  POL: "Polygon",
  LINK: "Chainlink",
  LTC: "Litecoin",
  UNI: "Uniswap",
  ATOM: "Cosmos",
  XLM: "Stellar",
  ETC: "Ethereum Classic",
  BCH: "Bitcoin Cash",
  ALGO: "Algorand",
  VET: "VeChain",
  FIL: "Filecoin",
  TRX: "TRON",
  NEAR: "NEAR Protocol",
  APT: "Aptos",
  ARB: "Arbitrum",
  OP: "Optimism",
  INJ: "Injective",
  SUI: "Sui",
  SHIB: "Shiba Inu",
  PEPE: "Pepe",
  USDT: "Tether",
  USDC: "USD Coin",
  BUSD: "Binance USD",
  FDUSD: "First Digital USD",
  DAI: "Dai",
};

function getSymbolName(symbol: string): string {
  return SYMBOL_NAMES[symbol] ?? symbol;
}

function sign(queryString: string, apiSecret: string): string {
  return createHmac("sha256", apiSecret).update(queryString).digest("hex");
}

async function signedRequest(
  path: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string> = {}
): Promise<Response> {
  const timestamp = Date.now().toString();
  const searchParams = new URLSearchParams({ ...params, timestamp });
  const queryString = searchParams.toString();
  const signature = sign(queryString, apiSecret);
  const url = `${BASE_URL}${path}?${queryString}&signature=${signature}`;

  return fetch(url, {
    headers: {
      "X-MBX-APIKEY": apiKey,
    },
  });
}

export class BinanceAdapter implements IExchangeAdapter {
  readonly exchange = "binance" as const;

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const res = await signedRequest("/api/v3/account", apiKey, apiSecret);
      return res.ok;
    } catch (err) {
      log.error({ err }, "validateCredentials failed");
      return false;
    }
  }

  async fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]> {
    const pockets: ExchangePocket[] = [];

    // --- Spot ---
    try {
      const accountRes = await signedRequest("/api/v3/account", apiKey, apiSecret);
      if (!accountRes.ok) {
        log.warn({ status: accountRes.status }, "Spot account fetch failed");
      } else {
        const accountData = (await accountRes.json()) as {
          balances: Array<{ asset: string; free: string; locked: string }>;
        };

        const nonZeroBalances = accountData.balances.filter(
          (b) => parseFloat(b.free) + parseFloat(b.locked) > 0
        );

        if (nonZeroBalances.length > 0) {
          // Fetch all USDT prices in one call
          const pricesRes = await fetch(`${BASE_URL}/api/v3/ticker/price`);
          const pricesData = pricesRes.ok
            ? ((await pricesRes.json()) as Array<{ symbol: string; price: string }>)
            : [];

          const priceMap = new Map<string, number>();
          for (const p of pricesData) {
            priceMap.set(p.symbol, parseFloat(p.price));
          }

          const spotAssets: ExchangeAsset[] = nonZeroBalances.map((b) => {
            const quantity = (parseFloat(b.free) + parseFloat(b.locked)).toString();
            let priceUsd: number;

            if (STABLECOINS.has(b.asset)) {
              priceUsd = 1;
            } else {
              priceUsd = priceMap.get(`${b.asset}USDT`) ?? 0;
            }

            const valueUsd = (parseFloat(quantity) * priceUsd).toFixed(2);

            return {
              symbol: b.asset,
              name: getSymbolName(b.asset),
              quantity,
              valueUsd,
            };
          });

          pockets.push({
            type: "spot",
            label: "Spot",
            assets: spotAssets,
          });
        }
      }
    } catch (err) {
      log.error({ err }, "fetchPockets spot failed");
    }

    // --- Earn ---
    try {
      const [flexRes, lockedRes] = await Promise.all([
        signedRequest("/sapi/v1/simple-earn/flexible/position", apiKey, apiSecret, { size: "100" }),
        signedRequest("/sapi/v1/simple-earn/locked/position", apiKey, apiSecret, { size: "100" }),
      ]);

      type EarnRow = { asset: string; totalAmount?: string; amount?: string };
      type EarnResponse = { rows: EarnRow[] };

      const flexData: EarnResponse = flexRes.ok
        ? ((await flexRes.json()) as EarnResponse)
        : { rows: [] };
      const lockedData: EarnResponse = lockedRes.ok
        ? ((await lockedRes.json()) as EarnResponse)
        : { rows: [] };

      // Merge positions by symbol
      const earnMap = new Map<string, number>();

      for (const row of flexData.rows) {
        const qty = parseFloat(row.totalAmount ?? row.amount ?? "0");
        earnMap.set(row.asset, (earnMap.get(row.asset) ?? 0) + qty);
      }
      for (const row of lockedData.rows) {
        const qty = parseFloat(row.totalAmount ?? row.amount ?? "0");
        earnMap.set(row.asset, (earnMap.get(row.asset) ?? 0) + qty);
      }

      if (earnMap.size > 0) {
        // Fetch prices for earn assets
        const pricesRes = await fetch(`${BASE_URL}/api/v3/ticker/price`);
        const pricesData = pricesRes.ok
          ? ((await pricesRes.json()) as Array<{ symbol: string; price: string }>)
          : [];

        const priceMap = new Map<string, number>();
        for (const p of pricesData) {
          priceMap.set(p.symbol, parseFloat(p.price));
        }

        const earnAssets: ExchangeAsset[] = Array.from(earnMap.entries()).map(
          ([asset, qty]) => {
            let priceUsd: number;
            if (STABLECOINS.has(asset)) {
              priceUsd = 1;
            } else {
              priceUsd = priceMap.get(`${asset}USDT`) ?? 0;
            }

            return {
              symbol: asset,
              name: getSymbolName(asset),
              quantity: qty.toString(),
              valueUsd: (qty * priceUsd).toFixed(2),
            };
          }
        );

        pockets.push({
          type: "earn",
          label: "Earn",
          assets: earnAssets,
        });
      }
    } catch (err) {
      log.warn({ err }, "fetchPockets earn failed (user may have no earn positions)");
    }

    return pockets;
  }
}
