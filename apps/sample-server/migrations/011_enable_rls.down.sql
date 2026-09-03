DROP POLICY IF EXISTS notif_tenant_isolation ON notifications;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fm_tenant_isolation ON file_metadata;
ALTER TABLE file_metadata DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS al_tenant_isolation ON audit_logs;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS us_tenant_isolation ON user_sessions;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rt_tenant_isolation ON refresh_tokens;
ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trp_tenant_isolation ON tenant_role_permissions;
ALTER TABLE tenant_role_permissions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_tenant_isolation ON users;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
