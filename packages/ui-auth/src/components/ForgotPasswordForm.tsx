import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, useForm, FormField, useToast, Alert } from '@mawsoftwares/ui-web';
import { ApiClient } from '@mawsoftwares/api-client';
import { useAuthT } from '../useAuthT';

export interface ForgotPasswordFormProps {
  readonly client: ApiClient;
  readonly onSwitchToLogin: () => void;
  readonly onResetReady: () => void;
  readonly tenantId: string;
  readonly initialEmail?: string;
}

export function ForgotPasswordForm({
  client,
  onSwitchToLogin,
  onResetReady,
  tenantId,
  initialEmail = '',
}: ForgotPasswordFormProps): ReactNode {
  const toast = useToast();
  const t = useAuthT();
  const [sent, setSent] = useState(false);

  const form = useForm({
    initialValues: { email: initialEmail },
    fields: { email: { required: true } },
    onSubmit: async (values) => {
      try {
        await client.request('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: values.email, tenantId }),
          headers: { 'Content-Type': 'application/json' },
        });
        setSent(true);
        toast.success(t('auth.resetEmailSent') || 'If an account exists, a reset email has been sent.');
      } catch {
        setSent(true);
        toast.success(t('auth.resetEmailSent') || 'If an account exists, a reset email has been sent.');
      }
    },
  });

  if (sent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
        <Card style={{ width: 400, maxWidth: '90vw', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>{t('auth.checkEmail') || 'Check Your Email'}</h2>
          <Alert variant="info">
            {t('auth.resetEmailInfo') || 'If an account with that email exists, we have sent a password reset link. Check your inbox.'}
          </Alert>
          <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'center', marginTop: 'var(--maw-space-lg)' }}>
            <Button variant="ghost" onClick={onSwitchToLogin}>{t('auth.backToLogin') || 'Back to Login'}</Button>
            <Button onClick={onResetReady}>{t('auth.haveResetToken') || 'I have a reset token'}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
      <Card style={{ width: 400, maxWidth: '90vw' }}>
        <h2 style={{ marginTop: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-xl)', fontWeight: 700 }}>
          {t('auth.forgotPassword') || 'Forgot Password'}
        </h2>
        <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
          {t('auth.forgotPasswordHint') || 'Enter your email and we will send you a reset link.'}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label={t('auth.email') || 'Email'} error={form.getFieldProps('email').error} required>
            <TextField
              value={form.values.email}
              onChange={form.getFieldProps('email').onChange}
              onBlur={form.getFieldProps('email').onBlur}
              placeholder="you@example.com"
            />
          </FormField>
          <Button type="submit" disabled={form.submitting} style={{ width: '100%', marginTop: 'var(--maw-space-md)' }}>
            {form.submitting ? (t('common.loading') || 'Sending...') : (t('auth.sendResetLink') || 'Send Reset Link')}
          </Button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 'var(--maw-space-lg)' }}>
          <Button variant="ghost" onClick={onSwitchToLogin}>{t('auth.backToLogin') || 'Back to Login'}</Button>
        </div>
      </Card>
    </div>
  );
}
