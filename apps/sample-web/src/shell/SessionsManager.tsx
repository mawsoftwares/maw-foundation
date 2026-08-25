import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Button, Card, Badge, Stack, useToast, Alert } from '@maw/ui-web';
import { client } from '../api';

interface SessionInfo {
  readonly id: string;
  readonly deviceInfo?: { deviceName?: string; deviceType?: string; os?: string; browser?: string };
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly createdAt: string;
  readonly lastActiveAt: string;
}

export function SessionsManager(): ReactNode {
  const toast = useToast();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const result = await client.request<{ sessions: SessionInfo[] }>('/auth/sessions');
        setSessions(result.sessions ?? []);
      } catch {
        setError('Failed to load sessions. The sessions endpoint may not be available.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reload = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await client.request<{ sessions: SessionInfo[] }>('/auth/sessions');
      setSessions(result.sessions ?? []);
    } catch {
      setError('Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await client.request(`/auth/sessions/${id}`, { method: 'DELETE' });
      toast.success('Session revoked');
      void reload();
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const revokeAll = async () => {
    try {
      await client.request('/auth/sessions', { method: 'DELETE' });
      toast.success('All other sessions revoked');
      void reload();
    } catch {
      toast.error('Failed to revoke sessions');
    }
  };

  return (
    <Card>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-md)' }}>
        <h3 style={{ margin: 0, color: 'var(--maw-fg)' }}>Active Sessions</h3>
        {sessions.length > 1 && (
          <Button variant="ghost" onClick={() => void revokeAll()} style={{ color: 'var(--maw-danger)' }}>
            Revoke All Others
          </Button>
        )}
      </Stack>

      {loading && <Alert variant="info">Loading sessions...</Alert>}

      {error && <Alert variant="warning">{error}</Alert>}

      {!loading && !error && sessions.length === 0 && (
        <Alert variant="info">No active sessions found.</Alert>
      )}

      {sessions.map((session) => (
        <div
          key={session.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--maw-space-sm) 0',
            borderBottom: '1px solid var(--maw-border)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: 'var(--maw-fg)' }}>
              {session.deviceInfo?.deviceName ?? session.deviceInfo?.browser ?? 'Unknown Device'}
            </div>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
              {session.ipAddress ?? 'Unknown IP'} &middot; Last active: {new Date(session.lastActiveAt).toLocaleString()}
            </div>
          </div>
          <Stack direction="row" align="center" gap="var(--maw-space-sm)">
            <Badge variant="success">Active</Badge>
            <Button variant="ghost" onClick={() => void revokeSession(session.id)} style={{ fontSize: 'var(--maw-text-xs)' }}>
              Revoke
            </Button>
          </Stack>
        </div>
      ))}
    </Card>
  );
}
