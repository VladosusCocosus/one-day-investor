-- Add language preference to user_settings. Existing rows default to 'en'.
ALTER TABLE user_settings
  ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
