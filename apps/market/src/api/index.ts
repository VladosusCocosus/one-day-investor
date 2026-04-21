import { Elysia } from "elysia";
import { assetCatalogApi } from "./asset-catalog";
import { pocketAssetsApi } from "./pocket-assets";
import { marketApi } from "./market";
import { searchAssetsApi } from "./search-assets";

export const api = new Elysia({ name: "market-api" })
  .use(assetCatalogApi)
  .use(pocketAssetsApi)
  .use(marketApi)
  .use(searchAssetsApi);
