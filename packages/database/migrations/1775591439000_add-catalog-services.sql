-- Create service type enum
CREATE TYPE service_type AS ENUM ('common', 'invest', 'crypto');

-- Create catalog_services table
CREATE TABLE catalog_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES catalog_services(id) ON DELETE CASCADE,
    service_type service_type NOT NULL DEFAULT 'common',
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(name, parent_id)
);
CREATE INDEX idx_catalog_services_parent_id ON catalog_services(parent_id);

-- Alter existing services table
ALTER TABLE services
    ADD COLUMN service_type service_type NOT NULL DEFAULT 'common',
    ADD COLUMN catalog_service_id UUID REFERENCES catalog_services(id) ON DELETE SET NULL;
CREATE INDEX idx_services_catalog_service_id ON services(catalog_service_id);

-- Seed catalog data
-- Revolut (parent)
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Revolut', NULL, 'common', 1);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Savings', 'a0000000-0000-0000-0000-000000000001', 'common', 1),
    ('Pocket', 'a0000000-0000-0000-0000-000000000001', 'common', 2),
    ('Invest', 'a0000000-0000-0000-0000-000000000001', 'invest', 3),
    ('Crypto', 'a0000000-0000-0000-0000-000000000001', 'crypto', 4);

-- Wise
INSERT INTO catalog_services (name, parent_id, service_type, sort_order)
VALUES ('Wise', NULL, 'common', 2);

-- Binance (parent)
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000003', 'Binance', NULL, 'crypto', 3);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Spot', 'a0000000-0000-0000-0000-000000000003', 'crypto', 1),
    ('Earn', 'a0000000-0000-0000-0000-000000000003', 'crypto', 2);

-- Interactive Brokers (parent)
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000004', 'Interactive Brokers', NULL, 'invest', 4);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Portfolio', 'a0000000-0000-0000-0000-000000000004', 'invest', 1),
    ('Cash', 'a0000000-0000-0000-0000-000000000004', 'common', 2);

-- Cash
INSERT INTO catalog_services (name, parent_id, service_type, sort_order)
VALUES ('Cash', NULL, 'common', 5);

-- Bank Account
INSERT INTO catalog_services (name, parent_id, service_type, sort_order)
VALUES ('Bank Account', NULL, 'common', 6);
