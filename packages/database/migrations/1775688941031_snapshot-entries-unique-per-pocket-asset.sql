-- Services that hold multiple pocket assets need one snapshot_entries row
-- per (snapshot, service, pocket_asset). The old UNIQUE(snapshot_id, service_id)
-- prevented that. Replace it with a constraint that also includes
-- pocket_asset_id, using NULLS NOT DISTINCT so the plain (non-pocket) entry
-- still collides with itself — i.e. a service can have at most:
--   * one entry with pocket_asset_id IS NULL (plain amount), AND
--   * one entry per distinct pocket_asset_id within the service.

ALTER TABLE snapshot_entries
  DROP CONSTRAINT snapshot_entries_snapshot_id_service_id_key;

ALTER TABLE snapshot_entries
  ADD CONSTRAINT snapshot_entries_snapshot_service_pocket_key
  UNIQUE NULLS NOT DISTINCT (snapshot_id, service_id, pocket_asset_id);
