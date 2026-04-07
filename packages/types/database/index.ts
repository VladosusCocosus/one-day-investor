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
  token: string;
  expires_at: Date;
  created_at: Date;
}

export type ServiceType = 'common' | 'invest' | 'crypto';

export interface CatalogService {
  id: string;
  name: string;
  parent_id: string | null;
  service_type: ServiceType;
  sort_order: number;
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
}

export interface Snapshot {
  id: string;
  user_id: string;
  month: Date;
  created_at: Date;
}

export interface SnapshotEntry {
  id: string;
  snapshot_id: string;
  service_id: string;
  amount: string; // numeric comes back as string from pg
}
