ALTER TABLE asset_catalog
  ADD COLUMN source TEXT,
  ADD COLUMN isin TEXT;

CREATE INDEX idx_asset_catalog_source ON asset_catalog (source);
CREATE INDEX idx_asset_catalog_isin ON asset_catalog (isin);
