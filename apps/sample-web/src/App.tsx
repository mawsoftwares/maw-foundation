import { useMemo, useState, type ReactNode } from 'react';
import { ApiClient, webSecureStore, ApiError } from '@maw/api-client';
import { EXAMPLE_RBAC } from '@maw/rbac-core';
import type { Session } from '@maw/sdk/contracts/identity';
import { AuthProvider, useAuth, Can, Button, TextField, Card } from '@maw/ui-web';
import { palette, spacing, typography } from '@maw/theme';

const API_URL = 'http://localhost:4000';

/** One shared client + secure store, backed by localStorage on web. */
const client = new ApiClient({
  baseUrl: API_URL,
  store: webSecureStore(window.localStorage),
  mode: 'token',
});

/** Restore an existing session on load (if a token is already stored). */
async function restore(): Promise<Session | null> {
  if ((await client.currentAccessToken()) === null) return null;
  try {
    return await client.request<Session>('/me');
  } catch {
    return null;
  }
}

function LoginForm(): ReactNode {
  const { login } = useAuth();
  const [email, setEmail] = useState('manager@demo.test');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  return (
    <Card style={{ maxWidth: 380 }}>
      <h2 style={{ marginTop: 0, color: palette.fg }}>Sign in</h2>
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error !== null && <p style={{ color: palette.danger }}>{error}</p>}
      <Button
        onClick={() => {
          setError(null);
          login({ email, password }).catch(() => setError('Invalid credentials'));
        }}
      >
        Log in
      </Button>
      <p style={{ fontSize: typography.size.sm, color: palette.fgMuted, marginBottom: 0 }}>
        Try <code>manager@demo.test</code> (can view reports) vs <code>clerk@demo.test</code> (cannot).
        Password: <code>password123</code>.
      </p>
    </Card>
  );
}

function ReportsPanel(): ReactNode {
  const [data, setData] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Card style={{ marginTop: spacing.lg }}>
      <h3 style={{ marginTop: 0 }}>Reports</h3>
      <Can
        permission="reports.view"
        fallback={<p style={{ color: palette.fgMuted }}>You don't have access to reports.</p>}
      >
        <Button
          onClick={() => {
            setErr(null);
            client
              .request<{ report: string }>('/reports')
              .then((r) => setData(JSON.stringify(r)))
              .catch((e: ApiError) => setErr(`${e.status}: ${e.message}`));
          }}
        >
          Load /reports
        </Button>
        {data !== null && <pre style={{ color: palette.success }}>{data}</pre>}
        {err !== null && <pre style={{ color: palette.danger }}>{err}</pre>}
      </Can>
    </Card>
  );
}

function Dashboard(): ReactNode {
  const { session, capabilities, logout } = useAuth();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{session?.role}</strong> — {session?.userId}
          <div style={{ fontSize: typography.size.sm, color: palette.fgMuted }}>
            capabilities: {capabilities.join(', ') || '(none)'}
          </div>
        </div>
        <Button variant="ghost" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
      <ReportsPanel />
    </div>
  );
}

function Shell(): ReactNode {
  const { session, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  return session === null ? <LoginForm /> : <Dashboard />;
}

export function App(): ReactNode {
  const rbac = useMemo(() => EXAMPLE_RBAC, []);
  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        maxWidth: 560,
        margin: '40px auto',
        padding: spacing.lg,
        color: palette.fg,
      }}
    >
      <h1>MAW Foundation — Web Sample</h1>
      <p style={{ color: palette.fgMuted }}>
        Same <code>@maw/rbac-core</code> resolver the server enforces with, driving this UI.
      </p>
      <AuthProvider client={client} rbac={rbac} restore={restore}>
        <Shell />
      </AuthProvider>
    </div>
  );
}
