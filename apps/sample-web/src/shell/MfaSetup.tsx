import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, FormField, useToast, Alert, Stack, Badge } from '@maw/ui-web';
import { client } from '../api';

export function MfaSetup(): ReactNode {
  const toast = useToast();
  const [enrollData, setEnrollData] = useState<{ secret: string; otpauthUri: string; backupCodes: string[] } | null>(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const enroll = async () => {
    setEnrolling(true);
    try {
      const result = await client.request<{ secret: string; otpauthUri: string; backupCodes: string[] }>('/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setEnrollData(result);
      toast.info('Scan the secret with your authenticator app');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const activate = async () => {
    try {
      await client.request('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ token: verifyToken }),
        headers: { 'Content-Type': 'application/json' },
      });
      setMfaEnabled(true);
      setEnrollData(null);
      setVerifyToken('');
      toast.success('MFA enabled successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const disable = async () => {
    try {
      await client.request('/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ token: disableToken }),
        headers: { 'Content-Type': 'application/json' },
      });
      setMfaEnabled(false);
      setDisableToken('');
      toast.success('MFA disabled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Disable failed');
    }
  };

  return (
    <Card>
      <Stack direction="row" align="center" gap="var(--maw-space-sm)" style={{ marginBottom: 'var(--maw-space-md)' }}>
        <h3 style={{ margin: 0, color: 'var(--maw-fg)' }}>Two-Factor Authentication</h3>
        <Badge variant={mfaEnabled ? 'success' : 'warning'}>{mfaEnabled ? 'Enabled' : 'Disabled'}</Badge>
      </Stack>

      {!mfaEnabled && !enrollData && (
        <div>
          <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
            Add an extra layer of security by enabling TOTP-based two-factor authentication.
          </p>
          <Button onClick={() => void enroll()} disabled={enrolling}>
            {enrolling ? 'Setting up...' : 'Enable 2FA'}
          </Button>
        </div>
      )}

      {enrollData && (
        <div>
          <Alert variant="warning" style={{ marginBottom: 'var(--maw-space-md)' }}>
            Add this secret to your authenticator app, then enter the code to verify.
          </Alert>
          <div style={{ background: 'var(--maw-bgMuted)', padding: 'var(--maw-space-md)', borderRadius: 'var(--maw-radius-md)', marginBottom: 'var(--maw-space-md)', fontFamily: 'monospace', fontSize: 'var(--maw-text-sm)', wordBreak: 'break-all' }}>
            {enrollData.secret}
          </div>
          <FormField label="Authenticator Code">
            <TextField value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="000000" />
          </FormField>
          <Button onClick={() => void activate()} disabled={verifyToken.length < 6} style={{ marginTop: 'var(--maw-space-sm)' }}>
            Verify & Activate
          </Button>

          {enrollData.backupCodes.length > 0 && (
            <div style={{ marginTop: 'var(--maw-space-lg)' }}>
              <Alert variant="info">Save these backup codes in a safe place. Each can be used once if you lose your authenticator.</Alert>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--maw-space-xs)', marginTop: 'var(--maw-space-sm)', background: 'var(--maw-bgMuted)', padding: 'var(--maw-space-md)', borderRadius: 'var(--maw-radius-md)' }}>
                {enrollData.backupCodes.map((code) => (
                  <code key={code} style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}>{code}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mfaEnabled && (
        <div>
          <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
            Enter a code from your authenticator app to disable 2FA.
          </p>
          <FormField label="Authenticator Code">
            <TextField value={disableToken} onChange={(e) => setDisableToken(e.target.value)} placeholder="000000" />
          </FormField>
          <Button variant="ghost" onClick={() => void disable()} disabled={disableToken.length < 6} style={{ marginTop: 'var(--maw-space-sm)', color: 'var(--maw-danger)' }}>
            Disable 2FA
          </Button>
        </div>
      )}
    </Card>
  );
}
