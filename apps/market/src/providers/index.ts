import type { MarketProvider } from "./types";
import { coingeckoProvider } from "./coingecko";
import { nasdaqtraderProvider } from "./nasdaqtrader";
import { euronextProvider } from "./euronext";
import { xetraProvider } from "./xetra";
import { bmeProvider } from "./bme";

export type { MarketProvider, AssetRecord, AssetType } from "./types";

export const providers: MarketProvider[] = [
  coingeckoProvider,
  nasdaqtraderProvider,
  euronextProvider,
  xetraProvider,
  bmeProvider,
];
