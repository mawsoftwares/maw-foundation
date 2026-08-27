import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Button, Card, Badge, Stack, useToast, Alert } from '@mawsoftwares/ui-web';
import { ApiClient } from '@mawsoftwares/api-client';
import { useAuthT } from '../useAuthT';

export interface SessionInfo {
  readonly id: string;
  readonly deviceInfo?: { deviceName?: string; deviceType?: string; os?: string; browser?: string };
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly createdAt: string;
  readonly lastActiveAt: string;
}

export interface SessionsManagerProps {
  readonly client: ApiClient;
}

export function SessionsManager({ client }: SessionsManagerProps): ReactNode {
  const toast = useToast();
  const t = useAuthT();
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
        setError(t('auth.sessionsLoadFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [client, t]);

  const reload = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await client.request<{ sessions: SessionInfo[] }>('/auth/sessions');
      setSessions(result.sessions ?? []);
    } catch {
      setError(t('auth.sessionsLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await client.request(`/auth/sessions/${id}`, { method: 'DELETE' });
      toast.success(t('auth.sessionRevoked'));
      void reload();
    } catch {
      toast.error(t('auth.sessionRevokeFailed'));
    }
  };

  const revokeAll = async () => {
    try {
      await client.request('/auth/sessions', { method: 'DELETE' });
      toast.success(t('auth.allSessionsRevoked'));
      void reload();
    } catch {
      toast.error(t('auth.sessionsRevokeFailed'));
    }
  };

  return (
    <Card>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-md)' }}>
        <h3 style={{ margin: 0, color: 'var(--maw-fg)' }}>{t('auth.activeSessions')}</h3>
        {sessions.length > 1 && (
          <Button variant="ghost" onClick={() => void revokeAll()} style={{ color: 'var(--maw-danger)' }}>
            {t('auth.revokeAllOthers')}
          </Button>
        )}
      </Stack>

      {loading && <Alert variant="info">{t('auth.loadingSessions')}</Alert>}

      {error && <Alert variant="warning">{error}</Alert>}

      {!loading && !error && sessions.length === 0 && (
        <Alert variant="info">{t('auth.noSessions')}</Alert>
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
              {session.deviceInfo?.deviceName ?? session.deviceInfo?.browser ?? t('auth.unknownDevice')}
            </div>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
              {session.ipAddress ?? t('auth.unknownIp')} &middot; {t('auth.lastActive')}: {new Date(session.lastActiveAt).toLocaleString()}
            </div>
          </div>
          <Stack direction="row" align="center" gap="var(--maw-space-sm)">
            <Badge variant="success">{t('common.active')}</Badge>
            <Button variant="ghost" onClick={() => void revokeSession(session.id)} style={{ fontSize: 'var(--maw-text-xs)' }}>
              {t('auth.revoke')}
            </Button>
          </Stack>
        </div>
      ))}
    </Card>
  );
}
