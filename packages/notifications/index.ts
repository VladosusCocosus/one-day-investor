import { createHmac, timingSafeEqual } from "crypto";
import config from "@config";

function getSecret(): string {
  return config.get("exchange.encryptionKey");
}

export function generateUnsubscribeToken(userId: string): string {
  const secret = getSecret();
  const hmac = createHmac("sha256", secret).update(userId).digest();
  const userPart = Buffer.from(userId).toString("base64url");
  const sigPart = hmac.toString("base64url");
  return `${userPart}:${sigPart}`;
}

export function validateUnsubscribeToken(token: string): string | null {
  const colonIdx = token.indexOf(":");
  if (colonIdx === -1) return null;

  const userPart = token.slice(0, colonIdx);
  const sigPart = token.slice(colonIdx + 1);

  let userId: string;
  try {
    userId = Buffer.from(userPart, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const secret = getSecret();
  const expected = createHmac("sha256", secret).update(userId).digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(sigPart, "base64url");
  } catch {
    return null;
  }

  if (expected.length !== provided.length) return null;
  if (!timingSafeEqual(expected, provided)) return null;

  return userId;
}
