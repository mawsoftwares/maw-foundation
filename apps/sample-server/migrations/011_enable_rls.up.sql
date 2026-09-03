-- Enable Row Level Security on tenant-scoped tables.
-- The application must SET LOCAL app.tenant_id before queries
-- (see packages/database/src/tenant/index.ts — setTenantContext).

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE tenant_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY trp_tenant_isolation ON tenant_role_permissions
  USING (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY rt_tenant_isolation ON refresh_tokens
  USING (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY us_tenant_isolation ON user_sessions
  USING (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY al_tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY fm_tenant_isolation ON file_metadata
  USING (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_tenant_isolation ON notifications
  USING (tenant_id = current_setting('app.tenant_id', true));
