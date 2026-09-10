-- Admin-manageable navigation menu, DB-backed so it can be edited without a
-- code deploy. Each item can require a permission and/or feature flag to be
-- visible; the frontend fetches the whole active tree once (per session) and
-- filters client-side with the same can()/isEnabled() checks it already uses
-- for the rest of the UI, so visibility rules stay in one place.

CREATE TABLE IF NOT EXISTS menu_items (
  id            SERIAL PRIMARY KEY,
  key           TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  path          TEXT,
  icon          TEXT,
  parent_id     INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  permission    TEXT,
  feature_flag  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS menu_items_parent_idx ON menu_items(parent_id);
