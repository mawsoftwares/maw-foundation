import { useMemo, type ReactNode } from 'react';
import { EXAMPLE_RBAC } from '@maw/rbac-core';
import { AuthProvider, DynamicAccessProvider, useAuth } from '@maw/ui-web';
import { palette, spacing } from '@maw/theme';
import { client } from './api';
import { loadDynamicAccess, restoreSession } from './session';
import { LoginForm } from './shell/LoginForm';
import { Dashboard } from './shell/Dashboard';
import { rootStyle } from './styles';

function Shell(): ReactNode {
  const { session, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  return session === null ? <LoginForm /> : <Dashboard />;
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
