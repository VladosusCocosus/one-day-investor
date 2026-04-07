-- Up Migration

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES services(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, name, parent_id)
);

CREATE INDEX idx_services_user_id ON services(user_id);
CREATE INDEX idx_services_parent_id ON services(parent_id);

CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, month)
);

CREATE INDEX idx_snapshots_user_id ON snapshots(user_id);

CREATE TABLE snapshot_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    UNIQUE(snapshot_id, service_id)
);

CREATE INDEX idx_snapshot_entries_snapshot_id ON snapshot_entries(snapshot_id);

-- Down Migration

DROP TABLE IF EXISTS snapshot_entries;
DROP TABLE IF EXISTS snapshots;
DROP TABLE IF EXISTS services;
