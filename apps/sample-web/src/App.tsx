import { useMemo, type ReactNode } from 'react';
import { EXAMPLE_RBAC } from '@maw/rbac-core';
import { AuthProvider, Button, DynamicAccessProvider, useAuth } from '@maw/ui-web';
import { palette, spacing } from '@maw/theme';
import { client } from './api';
import { loadDynamicAccess, restoreSession } from './session';
import { LoginForm } from './shell/LoginForm';
import { Dashboard } from './shell/Dashboard';
import { rootStyle } from './styles';

function Shell(): ReactNode {
  const { session, loading, logout } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (session === null) return <LoginForm />;
  if (session.role.toLowerCase() !== 'superadmin') {
    return (
      <div
        style={{
          marginTop: spacing.lg,
          border: `1px solid ${palette.border}`,
          borderRadius: 12,
          padding: spacing.lg,
          maxWidth: 520,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: spacing.sm }}>Access denied</h2>
        <p style={{ color: palette.fgMuted }}>
          This page is available only for users with the <strong>superadmin</strong> role.
        </p>
        <Button variant="ghost" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    );
  }
  return <Dashboard />;
}

export function App(): ReactNode {
  const rbac = useMemo(() => EXAMPLE_RBAC, []);
  return (
    <div style={rootStyle}>
      <h1 style={{ marginBottom: spacing.xs }}>MAW Foundation — Web Sample</h1>
      <p style={{ color: palette.fgMuted, marginTop: 0 }}>
        Same module-registry pattern as the server: add a feature file, register it, done.
      </p>
      <AuthProvider client={client} rbac={rbac} restore={restoreSession}>
        <DynamicAccessProvider load={loadDynamicAccess}>
          <Shell />
        </DynamicAccessProvider>
      </AuthProvider>
    </div>
  );
}
