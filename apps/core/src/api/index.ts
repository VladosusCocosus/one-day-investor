import { Elysia } from "elysia";
import { servicesApi } from "./services";
import { snapshotsApi } from "./snapshots";

export const api = new Elysia({ name: "api" })
  .use(servicesApi)
  .use(snapshotsApi);
