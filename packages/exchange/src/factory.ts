import type { ExchangeType, IExchangeAdapter } from "./types";
import { BinanceAdapter } from "./adapters/binance";
import { BybitAdapter } from "./adapters/bybit";
import { KrakenAdapter } from "./adapters/kraken";
import { CoinbaseAdapter } from "./adapters/coinbase";
import { OkxAdapter } from "./adapters/okx";
import { KucoinAdapter } from "./adapters/kucoin";
import { BitfinexAdapter } from "./adapters/bitfinex";
import { CryptoDotComAdapter } from "./adapters/cryptodotcom";
import { RevolutXAdapter } from "./adapters/revolut-x";

const adapters: Record<ExchangeType, () => IExchangeAdapter> = {
  binance: () => new BinanceAdapter(),
  bybit: () => new BybitAdapter(),
  kraken: () => new KrakenAdapter(),
  coinbase: () => new CoinbaseAdapter(),
  okx: () => new OkxAdapter(),
  kucoin: () => new KucoinAdapter(),
  bitfinex: () => new BitfinexAdapter(),
  "crypto.com": () => new CryptoDotComAdapter(),
  "revolut-x": () => new RevolutXAdapter(),
};

export function getAdapter(exchange: ExchangeType): IExchangeAdapter {
  const factory = adapters[exchange];
  if (!factory) {
    throw new Error(`Unknown exchange: ${exchange}`);
  }
  return factory();
}
