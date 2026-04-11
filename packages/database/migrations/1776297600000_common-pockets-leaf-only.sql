-- Up Migration
--
-- Pockets are now strictly grouping containers: snapshot entries and pocket
-- assets must live on a leaf (a service with no children). For every existing
-- service that has no children, create a same-named child and move all of its
-- snapshot entries AND pocket assets onto that new child.
--
-- This is a one-shot data cleanup. The Down migration cannot perfectly
-- reverse it because the auto-created children are indistinguishable from
-- user-created ones after the fact.

DO $$
DECLARE
    parent_row RECORD;
    new_child_id UUID;
BEGIN
    FOR parent_row IN
        SELECT s.*
        FROM services s
        WHERE NOT EXISTS (
            SELECT 1 FROM services c WHERE c.parent_id = s.id
        )
    LOOP
        INSERT INTO services (
            user_id, name, parent_id, service_type, sort_order, catalog_service_id
        )
        VALUES (
            parent_row.user_id,
            parent_row.name,
            parent_row.id,
            parent_row.service_type,
            parent_row.sort_order,
            NULL
        )
        RETURNING id INTO new_child_id;

        UPDATE snapshot_entries
        SET service_id = new_child_id
        WHERE service_id = parent_row.id;

        UPDATE pocket_assets
        SET service_id = new_child_id
        WHERE service_id = parent_row.id;
    END LOOP;
END $$;

-- Down Migration
--
-- Best-effort: move snapshot entries and pocket assets back from any child
-- whose name matches its parent (the marker for an auto-created child) onto
-- the parent, then delete those children. This is lossy if a user genuinely
-- created a child with the same name as its parent.

DO $$
DECLARE
    child_row RECORD;
BEGIN
    FOR child_row IN
        SELECT c.id AS child_id, p.id AS parent_id
        FROM services c
        JOIN services p ON p.id = c.parent_id
        WHERE c.name = p.name
    LOOP
        UPDATE snapshot_entries
        SET service_id = child_row.parent_id
        WHERE service_id = child_row.child_id;

        UPDATE pocket_assets
        SET service_id = child_row.parent_id
        WHERE service_id = child_row.child_id;

        DELETE FROM services WHERE id = child_row.child_id;
    END LOOP;
END $$;
