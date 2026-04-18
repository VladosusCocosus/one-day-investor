import { Elysia } from "elysia";
import { resolveUser } from "../auth/session";
import {
  createExchangeCredential,
  findExchangeCredentialsByUserId,
  findExchangeCredentialById,
  deleteExchangeCredential,
  createService,
  deleteService,
  findServicesByUserId,
} from "@database";
import {
  getAdapter,
  encrypt,
  decrypt,
  type ExchangeType,
  type ExchangePocket,
} from "@exchange";
import {
  cacheSet,
  cacheDel,
} from "@redis";
import { syncExchangeToDb } from "./exchange-sync";

const CACHE_TTL = 180; // 3 minutes

export const exchangeApi = new Elysia({ prefix: "/api/exchange" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .post("/connect", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { exchange, label, apiKey, apiSecret } = body as {
      exchange: ExchangeType;
      label: string;
      apiKey: string;
      apiSecret: string;
    };

    if (!exchange || !label || !apiKey || !apiSecret) {
      set.status = 400;
      return { error: "exchange, label, apiKey, and apiSecret are required" };
    }

    // Validate credentials
    const adapter = getAdapter(exchange);
    const valid = await adapter.validateCredentials(apiKey, apiSecret);
    if (!valid) {
      set.status = 400;
      return { error: "Invalid API credentials" };
    }

    // Create parent service for this exchange account
    const parentService = await createService({
      user_id: user.id,
      name: `${exchange.charAt(0).toUpperCase() + exchange.slice(1)} - ${label}`,
      parent_id: null,
      service_type: "crypto",
    });

    // Store encrypted credentials
    const credential = await createExchangeCredential({
      user_id: user.id,
      exchange,
      label,
      api_key: encrypt(apiKey),
      api_secret: encrypt(apiSecret),
      service_id: parentService.id,
    });

    // First sync — fetch from exchange, persist to DB, cache in Redis
    const pockets = await adapter.fetchPockets(apiKey, apiSecret);
    const syncResult = await syncExchangeToDb(
      user.id,
      parentService.id,
      pockets
    );

    // Build exchange prices map
    const prices: Record<string, number> = {};
    for (const pocket of pockets) {
      for (const asset of pocket.assets) {
        const qty = parseFloat(asset.quantity);
        const value = parseFloat(asset.valueUsd);
        if (qty > 0 && value > 0) {
          prices[asset.symbol] = value / qty;
        }
      }
    }

    // Cache in Redis
    await cacheSet(
      `user:${user.id}:exchange:${credential.id}`,
      { pockets, prices, cachedAt: new Date().toISOString() },
      CACHE_TTL
    );

    return {
      credential: {
        id: credential.id,
        exchange: credential.exchange,
        label: credential.label,
      },
      service: { id: parentService.id, name: parentService.name },
      syncResult,
    };
  })
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const credentials = await findExchangeCredentialsByUserId(user.id);
    return credentials.map((c) => ({
      id: c.id,
      exchange: c.exchange,
      label: c.label,
      serviceId: c.service_id,
      createdAt: c.created_at,
    }));
  })
  .delete("/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const credential = await findExchangeCredentialById(params.id);
    if (!credential || credential.user_id !== user.id) {
      set.status = 404;
      return { error: "Exchange connection not found" };
    }

    // Delete credential
    await deleteExchangeCredential(params.id, user.id);

    // Delete service tree if exists
    if (credential.service_id) {
      const services = await findServicesByUserId(user.id);
      const children = services.filter(
        (s) => s.parent_id === credential.service_id
      );
      for (const child of children) {
        await deleteService(child.id, user.id);
      }
      await deleteService(credential.service_id, user.id);
    }

    // Clear Redis cache
    await cacheDel(`user:${user.id}:exchange:${credential.id}`);
    await cacheDel(`user:${user.id}:pockets`);

    return { success: true };
  });
