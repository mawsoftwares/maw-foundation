import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Card, TextField, useForm, FormField, useToast, Alert } from '@mawsoftwares/ui-web';
import { ApiClient } from '@mawsoftwares/api-client';
import { useAuthT } from '../useAuthT';
import { AuthScreen } from './AuthScreen';

export interface VerifyEmailFormProps {
  readonly client: ApiClient;
  readonly onSwitchToLogin: () => void;
  readonly initialToken?: string;
}

export function VerifyEmailForm({
  client,
  onSwitchToLogin,
  initialToken = '',
}: VerifyEmailFormProps): ReactNode {
  const toast = useToast();
  const t = useAuthT();
  const [verified, setVerified] = useState(false);
  const autoSubmitted = useRef(false);

  const form = useForm({
    initialValues: { token: initialToken },
    fields: { token: { required: true } },
    onSubmit: async (values) => {
      try {
        await client.request('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token: values.token }),
          headers: { 'Content-Type': 'application/json' },
        });
        setVerified(true);
        toast.success(t('auth.emailVerified') || 'Email verified. You can sign in now.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : (t('auth.verificationFailed') || 'Verification failed');
        toast.error(msg);
        form.setError('token', msg);
      }
    },
  });

  useEffect(() => {
    if (initialToken.length > 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void form.handleSubmit();
    }
  }, [initialToken]);

  if (verified) {
    return (
      <AuthScreen>
        <Card style={{ width: 400, maxWidth: '90vw', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>{t('auth.emailVerifiedTitle') || 'Email verified'}</h2>
          <Alert variant="success">
            {t('auth.emailVerifiedDone') || 'Your email is confirmed. You can sign in with your password.'}
          </Alert>
          <Button onClick={onSwitchToLogin} style={{ marginTop: 'var(--maw-space-lg)' }}>
            {t('auth.login') || 'Sign In'}
          </Button>
        </Card>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <Card style={{ width: 420, maxWidth: '90vw' }}>
        <h2 style={{ marginTop: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-xl)', fontWeight: 700 }}>
          {t('auth.verifyEmail') || 'Verify Your Email'}
        </h2>
        <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
          {t('auth.verifyEmailHint') || 'Paste the code from your email, or open the confirmation link we sent you.'}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label={t('auth.verificationToken') || 'Verification code'} error={form.getFieldProps('token').error} required>
            <TextField
              value={form.values.token}
              onChange={form.getFieldProps('token').onChange}
              onBlur={form.getFieldProps('token').onBlur}
              placeholder={t('auth.resetTokenPlaceholder') || 'Paste the token from your email'}
            />
          </FormField>
          <Button type="submit" disabled={form.submitting} style={{ width: '100%', marginTop: 'var(--maw-space-md)' }}>
            {form.submitting ? (t('common.loading') || 'Verifying...') : (t('auth.verifyEmail') || 'Verify Email')}
          </Button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 'var(--maw-space-lg)' }}>
          <Button variant="ghost" onClick={onSwitchToLogin}>{t('auth.backToLogin') || 'Back to Login'}</Button>
        </div>
      </Card>
    </AuthScreen>
  );
}
