export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token: string | null;           // plaintext cookie sessions (legacy path)
  token_hash: string | null;      // sha256 hex of bearer tokens
  token_last4: string | null;     // last 4 chars of plaintext, for UI
  agent_id: string | null;        // null = cookie session, non-null = agent token
  expires_at: Date;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

export type AgentTokenExpiresIn = "1h" | "6h" | "24h" | "7d" | "30d";

export type ServiceType = 'common' | 'invest' | 'crypto';

export type IntegrationType = 'manual' | 'api';

export interface CatalogService {
  id: string;
  name: string;
  parent_id: string | null;
  service_type: ServiceType;
  sort_order: number;
  integration_type: IntegrationType;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  service_type: ServiceType;
  catalog_service_id: string | null;
  created_at: Date;
}

export interface UserSettings {
  user_id: string;
  snapshot_day: number;
  goal: string; // numeric comes back as string from pg
  currency: string;
  language: string;
  notify_snapshot_reminders: boolean;
  notify_service_updates: boolean;
  notify_blog_posts: boolean;
}

export type AssetType = 'crypto' | 'invest';

export interface AssetCatalog {
  id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  api_id: string;
  sort_order: number;
  source: string | null;
  isin: string | null;
}

export interface PocketAsset {
  id: string;
  service_id: string;
  asset_catalog_id: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  sort_order: number;
  quantity: string; // numeric from pg
}

export interface Snapshot {
  id: string;
  user_id: string;
  /** "YYYY-MM-DD" — Postgres DATE returned as a raw string by pool/index.ts. */
  month: string;
  created_at: Date;
}

export interface SnapshotEntry {
  id: string;
  snapshot_id: string;
  service_id: string;
  amount: string;                  // numeric comes back as string from pg
  pocket_asset_id: string | null;  // advisory link; nullable after pocket delete
  quantity: string | null;
  price: string | null;
  /** Frozen at snapshot creation so historical rendering never depends on a live pocket_asset. */
  symbol: string | null;
  name: string | null;
  isin: string | null;
}

export interface ExchangeCredential {
  id: string;
  user_id: string;
  exchange: string;
  label: string;
  api_key: string;
  api_secret: string;
  service_id: string | null;
  created_at: Date;
}
