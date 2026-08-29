import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import type { ApiSuccessResponse } from '@mawsoftwares/api/response/types';
import {
  Card,
  Badge,
  Button,
  Stack,
  Divider,
  TextField,
  useToast,
  PageLoader,
} from '@mawsoftwares/ui-web';
import { client } from '../api';

interface NotificationChannel {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly description: string;
}

export function NotificationsView(): ReactNode {
  const toast = useToast();
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [toEmail, setToEmail] = useState('test@demo.test');
  const [subject, setSubject] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification sent from the sample app.');

  const loadChannels = useCallback(() => {
    setLoading(true);
    client
      .request<ApiSuccessResponse<NotificationChannel[]>>('/api/v1/notifications/channels')
      .then((r) => setChannels(r.data))
      .catch((e: ApiError) => toast.error(`Load failed: ${e.message}`))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  const handleSend = () => {
    setSending(true);
    client
      .request<ApiSuccessResponse<{ sent: boolean; channel: string; to: string }>>('/api/v1/notifications/send', {
        method: 'POST',
        body: JSON.stringify({ channel: 'EMAIL', email: toEmail, subject, body }),
      })
      .then((r) => {
        toast.success(`Notification sent to ${r.data.to} via ${r.data.channel}`);
      })
      .catch((e: ApiError) => toast.error(`Send failed: ${e.message}`))
      .finally(() => setSending(false));
  };

  const label: React.CSSProperties = { fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', fontWeight: 500 };

  if (loading) return <PageLoader />;

  return (
    <div>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-xl)', flexWrap: 'wrap', gap: 'var(--maw-space-sm)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Notifications</h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
            Communication channels and test notifications
          </p>
        </div>
      </Stack>

      {/* Channels */}
      <h2 style={{ margin: '0 0 var(--maw-space-md)', fontSize: 'var(--maw-text-md)', fontWeight: 600, color: 'var(--maw-fg)' }}>Channels</h2>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--maw-space-xl)' }}>
        {channels.map((ch, i) => (
          <div key={ch.id}>
            <Stack
              direction="row" align="center" gap="var(--maw-space-lg)"
              style={{ padding: 'var(--maw-space-md) var(--maw-space-lg)', flexWrap: 'wrap' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--maw-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {ch.id === 'EMAIL' ? '✉' : ch.id === 'SMS' ? '📱' : ch.id === 'PUSH' ? '🔔' : '📥'}
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: 'var(--maw-fg)' }}>
                  {ch.name}
                </div>
                <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2 }}>
                  {ch.description}
                </div>
              </div>
              <Badge variant={ch.enabled ? 'success' : 'default'}>
                {ch.enabled ? 'Active' : 'Not Configured'}
              </Badge>
            </Stack>
            {i < channels.length - 1 && <Divider />}
          </div>
        ))}
      </Card>

      {/* Send Test Notification */}
      <h2 style={{ margin: '0 0 var(--maw-space-md)', fontSize: 'var(--maw-text-md)', fontWeight: 600, color: 'var(--maw-fg)' }}>Send Test Notification</h2>
      <Card style={{ padding: 'var(--maw-space-lg)', marginBottom: 'var(--maw-space-xl)' }}>
        <Stack gap="var(--maw-space-md)">
          <div>
            <div style={label}>Channel</div>
            <Badge variant="info" style={{ marginTop: 4 }}>EMAIL (Console Provider)</Badge>
          </div>
          <TextField label="To" value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
          <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <TextField label="Body" value={body} onChange={(e) => setBody(e.target.value)} />
          <Stack direction="row" gap="var(--maw-space-sm)" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button onClick={handleSend} disabled={sending || !toEmail || !subject}>
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </Stack>
          <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', background: 'var(--maw-surface)', padding: 'var(--maw-space-sm)', borderRadius: 'var(--maw-radius-sm)' }}>
            The sample server uses ConsoleNotificationProvider — check the server terminal for the output.
          </div>
        </Stack>
      </Card>
    </div>
  );
}
