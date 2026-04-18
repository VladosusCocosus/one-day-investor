import { redis } from "./client";

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const raw = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.set(key, raw, "EX", ttlSeconds);
  } else {
    await redis.set(key, raw);
  }
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

export async function cacheKeys(pattern: string): Promise<string[]> {
  return redis.keys(pattern);
}
