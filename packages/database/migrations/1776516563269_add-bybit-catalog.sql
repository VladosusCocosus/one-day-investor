-- Up Migration
-- Add Bybit to catalog
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000005', 'Bybit', NULL, 'crypto', 7);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Spot', 'a0000000-0000-0000-0000-000000000005', 'crypto', 1),
    ('Earn', 'a0000000-0000-0000-0000-000000000005', 'crypto', 2),
    ('Futures', 'a0000000-0000-0000-0000-000000000005', 'crypto', 3);

-- Add Futures to existing Binance catalog
INSERT INTO catalog_services (name, parent_id, service_type, sort_order)
VALUES ('Futures', 'a0000000-0000-0000-0000-000000000003', 'crypto', 3);

-- Down Migration