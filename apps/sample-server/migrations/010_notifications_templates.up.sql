CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB,
  action_url  TEXT,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_tenant ON notifications (user_id, tenant_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, tenant_id) WHERE read = FALSE;

CREATE TABLE IF NOT EXISTS notification_templates (
  id          TEXT PRIMARY KEY,
  channel     TEXT NOT NULL,
  name        TEXT NOT NULL,
  subject     TEXT,
  body        TEXT NOT NULL,
  html        TEXT,
  variables   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_channel ON notification_templates (channel);
