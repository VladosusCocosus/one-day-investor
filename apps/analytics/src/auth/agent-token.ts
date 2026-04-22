import { randomBytes, createHash } from "node:crypto";
import type { AgentTokenExpiresIn } from "@types";

const TOKEN_PREFIX = "oda_";

/** Returns { plaintext, hash, last4 }. Plaintext shown once to the user. */
export function generateAgentToken(): {
  plaintext: string;
  hash: string;
  last4: string;
} {
  const raw = randomBytes(32).toString("base64url"); // ~43 chars
  const plaintext = `${TOKEN_PREFIX}${raw}`;
  const hash = sha256Hex(plaintext);
  const last4 = plaintext.slice(-4);
  return { plaintext, hash, last4 };
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.*)$/i.exec(header);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

const EXPIRES_IN_MS: Record<AgentTokenExpiresIn, number> = {
  "1h":  60 * 60 * 1000,
  "6h":  6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d":  7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function isValidExpiresIn(
  value: string
): value is AgentTokenExpiresIn {
  return value in EXPIRES_IN_MS;
}

export function expiresAtFrom(expiresIn: AgentTokenExpiresIn): Date {
  return new Date(Date.now() + EXPIRES_IN_MS[expiresIn]);
}
