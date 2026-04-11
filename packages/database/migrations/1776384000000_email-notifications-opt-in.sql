-- Up Migration

ALTER TABLE user_settings
    ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Down Migration

ALTER TABLE user_settings
    DROP COLUMN IF EXISTS email_notifications_enabled;
