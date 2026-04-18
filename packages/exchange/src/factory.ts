import type { ExchangeType, IExchangeAdapter } from "./types";
import { BinanceAdapter } from "./adapters/binance";
import { BybitAdapter } from "./adapters/bybit";

const adapters: Record<ExchangeType, () => IExchangeAdapter> = {
  binance: () => new BinanceAdapter(),
  bybit: () => new BybitAdapter(),
};

export function getAdapter(exchange: ExchangeType): IExchangeAdapter {
  const factory = adapters[exchange];
  if (!factory) {
    throw new Error(`Unknown exchange: ${exchange}`);
  }
  return factory();
}
