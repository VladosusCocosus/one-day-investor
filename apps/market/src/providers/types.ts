export type AssetType = "crypto" | "invest";

export interface AssetRecord {
  symbol: string;     // canonical Yahoo-compatible ticker (e.g. "AAPL", "AIR.PA")
  name: string;
  asset_type: AssetType;
  api_id: string;     // ID used by the price-fetch path (CoinGecko id, or symbol)
  isin?: string | null; // ISO 6166 ISIN if known (Xetra, Euronext, etc.)
  // `source` is filled in by the orchestrator from `provider.name`,
  // so providers don't have to set it themselves.
}

export interface MarketProvider {
  name: string;         // CLI key + asset_catalog.source value, e.g. "nasdaqtrader"
  description: string;  // human-readable, shown in CLI listing
  fetch(): Promise<AssetRecord[]>;
}
