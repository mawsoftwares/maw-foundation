import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, FormField, useToast, Alert, Stack, Badge } from '@mawsoftwares/ui-web';
import { ApiClient } from '@mawsoftwares/api-client';
import { useAuthT } from '../useAuthT';

export interface MfaSetupProps {
  readonly client: ApiClient;
}

export function MfaSetup({ client }: MfaSetupProps): ReactNode {
  const toast = useToast();
  const t = useAuthT();
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
      toast.info(t('auth.mfaScanSecret'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('auth.mfaEnrollFailed'));
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
      toast.success(t('auth.mfaEnabled'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('auth.mfaVerifyFailed'));
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
      toast.success(t('auth.mfaDisabled'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('auth.mfaDisableFailed'));
    }
  };

  return (
    <Card>
      <Stack direction="row" align="center" gap="var(--maw-space-sm)" style={{ marginBottom: 'var(--maw-space-md)' }}>
        <h3 style={{ margin: 0, color: 'var(--maw-fg)' }}>{t('auth.twoFactorAuth')}</h3>
        <Badge variant={mfaEnabled ? 'success' : 'warning'}>{mfaEnabled ? t('common.enabled') : t('common.disabled')}</Badge>
      </Stack>

      {!mfaEnabled && !enrollData && (
        <div>
          <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
            {t('auth.mfaDescription')}
          </p>
          <Button onClick={() => void enroll()} disabled={enrolling}>
            {enrolling ? t('common.loading') : t('auth.enable2fa')}
          </Button>
        </div>
      )}

      {enrollData && (
        <div>
          <Alert variant="warning" style={{ marginBottom: 'var(--maw-space-md)' }}>
            {t('auth.mfaAddSecret')}
          </Alert>
          <div style={{ background: 'var(--maw-bgMuted)', padding: 'var(--maw-space-md)', borderRadius: 'var(--maw-radius-md)', marginBottom: 'var(--maw-space-md)', fontFamily: 'monospace', fontSize: 'var(--maw-text-sm)', wordBreak: 'break-all' }}>
            {enrollData.secret}
          </div>
          <FormField label={t('auth.authenticatorCode')}>
            <TextField value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="000000" />
          </FormField>
          <Button onClick={() => void activate()} disabled={verifyToken.length < 6} style={{ marginTop: 'var(--maw-space-sm)' }}>
            {t('auth.verifyAndActivate')}
          </Button>

          {enrollData.backupCodes.length > 0 && (
            <div style={{ marginTop: 'var(--maw-space-lg)' }}>
               <Alert variant="info">{t('auth.backupCodesInfo')}</Alert>
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
            {t('auth.mfaDisableHint')}
          </p>
          <FormField label={t('auth.authenticatorCode')}>
            <TextField value={disableToken} onChange={(e) => setDisableToken(e.target.value)} placeholder="000000" />
          </FormField>
          <Button variant="ghost" onClick={() => void disable()} disabled={disableToken.length < 6} style={{ marginTop: 'var(--maw-space-sm)', color: 'var(--maw-danger)' }}>
            {t('auth.disable2fa')}
          </Button>
        </div>
      )}
    </Card>
  );
}
