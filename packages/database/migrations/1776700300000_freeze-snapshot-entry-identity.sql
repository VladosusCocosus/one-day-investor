-- Snapshots are historical records and must never change when users edit
-- their live portfolio. Freeze the asset identity (symbol, name, isin) onto
-- each snapshot_entries row at creation time. Display and totals read from
-- the frozen fields; pocket_asset_id stays as a nullable advisory link for
-- analytics only ("is this the same asset I hold today?").
--
-- This also retires the UNIQUE NULLS NOT DISTINCT (snapshot_id, service_id,
-- pocket_asset_id) constraint, which collided whenever a pocket_asset was
-- deleted and its FK (ON DELETE SET NULL) nullified multiple rows under the
-- same (snapshot, service). The new key uses symbol instead; pocket_asset_id
-- being nulled is harmless to uniqueness.

ALTER TABLE snapshot_entries
    ADD COLUMN symbol TEXT,
    ADD COLUMN name   TEXT,
    ADD COLUMN isin   TEXT;

-- Backfill identity from the currently-linked pocket_asset + asset_catalog.
-- Legacy rows whose pocket_asset has already been hard-deleted (pocket_asset_id
-- is NULL or dangling) stay as NULL — there's no recoverable identity for them.
UPDATE snapshot_entries se
    SET symbol = pa.symbol,
        name   = pa.name,
        isin   = ac.isin
   FROM pocket_assets pa
   LEFT JOIN asset_catalog ac ON pa.asset_catalog_id = ac.id
  WHERE pa.id = se.pocket_asset_id;

-- Swap the unique key from (…, pocket_asset_id) to (…, symbol). Both use
-- NULLS NOT DISTINCT so the "one plain entry per service" invariant stays
-- (null symbol == the manual-amount row for a common pocket).
ALTER TABLE snapshot_entries
    DROP CONSTRAINT snapshot_entries_snapshot_service_pocket_key;

ALTER TABLE snapshot_entries
    ADD CONSTRAINT snapshot_entries_snapshot_service_symbol_key
    UNIQUE NULLS NOT DISTINCT (snapshot_id, service_id, symbol);

CREATE INDEX idx_snapshot_entries_symbol
    ON snapshot_entries(symbol) WHERE symbol IS NOT NULL;
CREATE INDEX idx_snapshot_entries_isin
    ON snapshot_entries(isin) WHERE isin IS NOT NULL;
