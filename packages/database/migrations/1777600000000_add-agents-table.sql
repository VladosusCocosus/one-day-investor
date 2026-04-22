-- Agents and agent-session token infrastructure.

CREATE TABLE agents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

CREATE INDEX agents_user_id_active_idx ON agents (user_id) WHERE revoked_at IS NULL;

-- Extend sessions to support bearer-token agent sessions alongside cookie sessions.
ALTER TABLE sessions ADD COLUMN agent_id     uuid REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN token_hash   text;
ALTER TABLE sessions ADD COLUMN token_last4  text;
ALTER TABLE sessions ADD COLUMN last_used_at timestamptz;
ALTER TABLE sessions ADD COLUMN revoked_at   timestamptz;

-- Make the existing token column nullable so future agent sessions can use token_hash only.
ALTER TABLE sessions ALTER COLUMN token DROP NOT NULL;

CREATE INDEX sessions_agent_id_idx          ON sessions (agent_id)   WHERE agent_id IS NOT NULL;
CREATE UNIQUE INDEX sessions_token_hash_key ON sessions (token_hash) WHERE token_hash IS NOT NULL;
