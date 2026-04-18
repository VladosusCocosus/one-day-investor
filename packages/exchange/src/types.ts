export type ExchangeType = "binance" | "bybit" | "kraken" | "coinbase" | "okx" | "kucoin" | "bitfinex" | "crypto.com";

export interface ExchangeAsset {
  symbol: string;
  name: string;
  quantity: string;
  valueUsd: string;
}

export interface ExchangePocket {
  type: string;
  label: string;
  assets: ExchangeAsset[];
}

export interface IExchangeAdapter {
  readonly exchange: ExchangeType;
  validateCredentials(apiKey: string, apiSecret: string): Promise<boolean>;
  fetchPockets(apiKey: string, apiSecret: string): Promise<ExchangePocket[]>;
}
