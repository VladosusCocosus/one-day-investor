-- Asset type enum
CREATE TYPE asset_type AS ENUM ('crypto', 'invest');

-- Asset catalog
CREATE TABLE asset_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_type asset_type NOT NULL,
    api_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(symbol, asset_type)
);
CREATE INDEX idx_asset_catalog_type ON asset_catalog(asset_type);

-- Pocket assets
CREATE TABLE pocket_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    asset_catalog_id UUID REFERENCES asset_catalog(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_type asset_type NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(service_id, symbol)
);
CREATE INDEX idx_pocket_assets_service_id ON pocket_assets(service_id);

-- Extend snapshot_entries
ALTER TABLE snapshot_entries
    ADD COLUMN pocket_asset_id UUID REFERENCES pocket_assets(id) ON DELETE SET NULL,
    ADD COLUMN quantity NUMERIC,
    ADD COLUMN price NUMERIC;

-- Seed: Crypto (CoinGecko api_ids)
INSERT INTO asset_catalog (symbol, name, asset_type, api_id, sort_order) VALUES
    ('BTC', 'Bitcoin', 'crypto', 'bitcoin', 1),
    ('ETH', 'Ethereum', 'crypto', 'ethereum', 2),
    ('SOL', 'Solana', 'crypto', 'solana', 3),
    ('BNB', 'BNB', 'crypto', 'binancecoin', 4),
    ('XRP', 'Ripple', 'crypto', 'ripple', 5),
    ('ADA', 'Cardano', 'crypto', 'cardano', 6),
    ('DOGE', 'Dogecoin', 'crypto', 'dogecoin', 7),
    ('DOT', 'Polkadot', 'crypto', 'polkadot', 8),
    ('AVAX', 'Avalanche', 'crypto', 'avalanche-2', 9),
    ('LINK', 'Chainlink', 'crypto', 'chainlink', 10),
    ('MATIC', 'Polygon', 'crypto', 'matic-network', 11),
    ('UNI', 'Uniswap', 'crypto', 'uniswap', 12),
    ('LTC', 'Litecoin', 'crypto', 'litecoin', 13),
    ('ATOM', 'Cosmos', 'crypto', 'cosmos', 14),
    ('NEAR', 'NEAR Protocol', 'crypto', 'near', 15),
    ('XLM', 'Stellar', 'crypto', 'stellar', 16),
    ('ALGO', 'Algorand', 'crypto', 'algorand', 17),
    ('TON', 'Toncoin', 'crypto', 'the-open-network', 18),
    ('TRX', 'TRON', 'crypto', 'tron', 19),
    ('SUI', 'Sui', 'crypto', 'sui', 20);

-- Seed: Stocks/ETFs (Yahoo Finance tickers)
INSERT INTO asset_catalog (symbol, name, asset_type, api_id, sort_order) VALUES
    ('AAPL', 'Apple Inc.', 'invest', 'AAPL', 1),
    ('MSFT', 'Microsoft Corp.', 'invest', 'MSFT', 2),
    ('GOOGL', 'Alphabet Inc.', 'invest', 'GOOGL', 3),
    ('AMZN', 'Amazon.com Inc.', 'invest', 'AMZN', 4),
    ('NVDA', 'NVIDIA Corp.', 'invest', 'NVDA', 5),
    ('TSLA', 'Tesla Inc.', 'invest', 'TSLA', 6),
    ('META', 'Meta Platforms', 'invest', 'META', 7),
    ('BRK-B', 'Berkshire Hathaway', 'invest', 'BRK-B', 8),
    ('JPM', 'JPMorgan Chase', 'invest', 'JPM', 9),
    ('V', 'Visa Inc.', 'invest', 'V', 10),
    ('VOO', 'Vanguard S&P 500 ETF', 'invest', 'VOO', 11),
    ('SPY', 'SPDR S&P 500 ETF', 'invest', 'SPY', 12),
    ('QQQ', 'Invesco QQQ Trust', 'invest', 'QQQ', 13),
    ('VTI', 'Vanguard Total Stock', 'invest', 'VTI', 14),
    ('VXUS', 'Vanguard Intl Stock', 'invest', 'VXUS', 15),
    ('VGT', 'Vanguard IT ETF', 'invest', 'VGT', 16),
    ('SCHD', 'Schwab US Dividend', 'invest', 'SCHD', 17),
    ('IWM', 'iShares Russell 2000', 'invest', 'IWM', 18),
    ('EFA', 'iShares MSCI EAFE', 'invest', 'EFA', 19),
    ('AGG', 'iShares Core US Agg Bond', 'invest', 'AGG', 20);
