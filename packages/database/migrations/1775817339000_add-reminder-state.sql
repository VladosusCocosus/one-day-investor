-- Up Migration

CREATE TABLE reminder_state (
    user_id                  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_snapshot_at         TIMESTAMPTZ NOT NULL,
    last_reminder_sent_at    TIMESTAMPTZ
);

CREATE INDEX idx_reminder_state_due
    ON reminder_state (last_snapshot_at, last_reminder_sent_at);

-- Down Migration

DROP TABLE IF EXISTS reminder_state;
