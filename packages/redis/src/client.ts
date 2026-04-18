import Redis from "ioredis";
import config from "@config";
import { createLogger } from "@logger";

const log = createLogger("redis");

const redisUrl = config.get("redis.url");

export const redis = new Redis(redisUrl);

redis.on("connect", () => {
  log.info("Redis connected");
});

redis.on("error", (err) => {
  log.error({ err }, "Redis connection error");
});
