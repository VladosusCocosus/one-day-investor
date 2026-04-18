-- Add per-category notification columns
ALTER TABLE user_settings
  ADD COLUMN notify_snapshot_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN notify_service_updates BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN notify_blog_posts BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing preferences: opted-in users get all 3 enabled
UPDATE user_settings
SET notify_snapshot_reminders = TRUE,
    notify_service_updates = TRUE,
    notify_blog_posts = TRUE
WHERE email_notifications_enabled = TRUE;

-- Drop the old column
ALTER TABLE user_settings DROP COLUMN email_notifications_enabled;
