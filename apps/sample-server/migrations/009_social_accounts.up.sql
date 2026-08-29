CREATE TABLE IF NOT EXISTS social_account_links (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);

CREATE INDEX idx_social_account_links_user ON social_account_links (user_id);
CREATE INDEX idx_social_account_links_provider ON social_account_links (provider, provider_id);
