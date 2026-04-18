-- Kraken
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000006', 'Kraken', NULL, 'crypto', 8);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Spot', 'a0000000-0000-0000-0000-000000000006', 'crypto', 1),
    ('Staking', 'a0000000-0000-0000-0000-000000000006', 'crypto', 2);

-- Coinbase
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000007', 'Coinbase', NULL, 'crypto', 9);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Spot', 'a0000000-0000-0000-0000-000000000007', 'crypto', 1);

-- OKX
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000008', 'OKX', NULL, 'crypto', 10);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Trading', 'a0000000-0000-0000-0000-000000000008', 'crypto', 1),
    ('Funding', 'a0000000-0000-0000-0000-000000000008', 'crypto', 2),
    ('Earn', 'a0000000-0000-0000-0000-000000000008', 'crypto', 3);

-- KuCoin
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000009', 'KuCoin', NULL, 'crypto', 11);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Spot', 'a0000000-0000-0000-0000-000000000009', 'crypto', 1),
    ('Main', 'a0000000-0000-0000-0000-000000000009', 'crypto', 2),
    ('Earn', 'a0000000-0000-0000-0000-000000000009', 'crypto', 3);

-- Bitfinex
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-00000000000a', 'Bitfinex', NULL, 'crypto', 12);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Spot', 'a0000000-0000-0000-0000-00000000000a', 'crypto', 1),
    ('Margin', 'a0000000-0000-0000-0000-00000000000a', 'crypto', 2);

-- Crypto.com
INSERT INTO catalog_services (id, name, parent_id, service_type, sort_order)
VALUES ('a0000000-0000-0000-0000-00000000000b', 'Crypto.com', NULL, 'crypto', 13);

INSERT INTO catalog_services (name, parent_id, service_type, sort_order) VALUES
    ('Spot', 'a0000000-0000-0000-0000-00000000000b', 'crypto', 1);
