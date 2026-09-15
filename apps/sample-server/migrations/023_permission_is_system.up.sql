-- Distinguish registry-synced (system) permissions from admin-created (custom)
-- ones so boot-time sync cannot prune custom RBAC definitions.

ALTER TABLE master_permissions
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT TRUE;
