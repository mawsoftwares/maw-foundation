-- Strict role hierarchy: higher level outranks lower; same level cannot see each other.
ALTER TABLE master_roles ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0;

UPDATE master_roles SET level = CASE code
  WHEN 'super_admin' THEN 100
  WHEN 'owner'       THEN 90
  WHEN 'admin'       THEN 80
  WHEN 'manager'     THEN 60
  WHEN 'clerk'       THEN 40
  WHEN 'viewer'      THEN 20
  ELSE level
END;
