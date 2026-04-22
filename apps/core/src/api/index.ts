import { Elysia } from "elysia";
import { createAgentScope } from "../auth/agent-scope";
import { servicesApi } from "./services";
import { snapshotsApi } from "./snapshots";
import { catalogApi } from "./catalog";
import { settingsApi } from "./settings";
import { exchangeApi } from "./exchange";
import { assetsApi } from "./assets";
import { notificationsApi } from "./notifications";
import { adminApi } from "./admin";
import { agentsApi } from "./agents";

const CORE_AGENT_ALLOWED_PREFIXES = [
  "/api/snapshots",
  "/api/services",
  "/api/assets",
  "/api/catalog",
] as const;

export const api = new Elysia({ name: "api" })
  .use(createAgentScope(CORE_AGENT_ALLOWED_PREFIXES))
  .use(servicesApi)
  .use(snapshotsApi)
  .use(catalogApi)
  .use(settingsApi)
  .use(exchangeApi)
  .use(assetsApi)
  .use(notificationsApi)
  .use(adminApi)
  .use(agentsApi);
