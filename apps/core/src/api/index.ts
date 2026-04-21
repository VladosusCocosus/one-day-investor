import { Elysia } from "elysia";
import { servicesApi } from "./services";
import { snapshotsApi } from "./snapshots";
import { catalogApi } from "./catalog";
import { settingsApi } from "./settings";
import { exchangeApi } from "./exchange";
import { assetsApi } from "./assets";
import { notificationsApi } from "./notifications";
import { adminApi } from "./admin";
import { pdfImportApi } from "./pdf-import";

export const api = new Elysia({ name: "api" })
  .use(servicesApi)
  .use(snapshotsApi)
  .use(catalogApi)
  .use(settingsApi)
  .use(exchangeApi)
  .use(assetsApi)
  .use(notificationsApi)
  .use(adminApi)
  .use(pdfImportApi);
