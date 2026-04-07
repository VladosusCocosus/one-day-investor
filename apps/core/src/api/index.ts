import { Elysia } from "elysia";
import { servicesApi } from "./services";
import { snapshotsApi } from "./snapshots";
import { catalogApi } from "./catalog";
import { settingsApi } from "./settings";
import { assetCatalogApi } from "./asset-catalog";
import { pocketAssetsApi } from "./pocket-assets";

export const api = new Elysia({ name: "api" })
  .use(servicesApi)
  .use(snapshotsApi)
  .use(catalogApi)
  .use(settingsApi)
  .use(assetCatalogApi)
  .use(pocketAssetsApi);
