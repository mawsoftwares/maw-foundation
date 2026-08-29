import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, useForm, FormField, useToast, Alert } from '@mawsoftwares/ui-web';
import { ApiClient } from '@mawsoftwares/api-client';
import { useAuthT } from '../useAuthT';
import { AuthScreen } from './AuthScreen';

export interface ResetPasswordFormProps {
  readonly client: ApiClient;
  readonly onSwitchToLogin: () => void;
  readonly initialToken?: string;
}

export function ResetPasswordForm({ client, onSwitchToLogin, initialToken = '' }: ResetPasswordFormProps): ReactNode {
  const toast = useToast();
  const t = useAuthT();
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: { token: initialToken, newPassword: '', confirmPassword: '' },
    fields: {
      token: { required: true },
      newPassword: { required: true },
      confirmPassword: { required: true },
    },
    onSubmit: async (values) => {
      if (values.newPassword !== values.confirmPassword) {
        form.setError('confirmPassword', t('auth.passwordsMismatch') || 'Passwords do not match');
        return;
      }
      try {
        await client.request('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token: values.token, newPassword: values.newPassword }),
          headers: { 'Content-Type': 'application/json' },
        });
        setSuccess(true);
        toast.success(t('auth.passwordResetSuccess') || 'Password has been reset successfully!');
      } catch (err) {
        const msg = err instanceof Error ? err.message : (t('auth.resetFailed') || 'Reset failed');
        toast.error(msg);
        form.setError('token', msg);
      }
    },
  });

  if (success) {
    return (
      <AuthScreen>
        <Card style={{ width: 400, maxWidth: '90vw', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>{t('auth.passwordReset') || 'Password Reset'}</h2>
          <Alert variant="success">{t('auth.passwordResetDone') || 'Your password has been successfully reset. You can now sign in with your new password.'}</Alert>
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
          {t('auth.resetPassword') || 'Reset Password'}
        </h2>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label={t('auth.resetToken') || 'Reset Token'} error={form.getFieldProps('token').error} required>
            <TextField
              value={form.values.token}
              onChange={form.getFieldProps('token').onChange}
              onBlur={form.getFieldProps('token').onBlur}
              placeholder={t('auth.resetTokenPlaceholder') || 'Paste the token from your email'}
            />
          </FormField>
          <FormField label={t('auth.newPassword') || 'New Password'} error={form.getFieldProps('newPassword').error} required>
            <TextField
              type="password"
              value={form.values.newPassword}
              onChange={form.getFieldProps('newPassword').onChange}
              onBlur={form.getFieldProps('newPassword').onBlur}
            />
          </FormField>
          <FormField label={t('auth.confirmPassword') || 'Confirm Password'} error={form.getFieldProps('confirmPassword').error} required>
            <TextField
              type="password"
              value={form.values.confirmPassword}
              onChange={form.getFieldProps('confirmPassword').onChange}
              onBlur={form.getFieldProps('confirmPassword').onBlur}
            />
          </FormField>
          <Button type="submit" disabled={form.submitting} style={{ width: '100%', marginTop: 'var(--maw-space-md)' }}>
            {form.submitting ? (t('common.loading') || 'Resetting...') : (t('auth.resetPassword') || 'Reset Password')}
          </Button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 'var(--maw-space-lg)' }}>
          <Button variant="ghost" onClick={onSwitchToLogin}>{t('auth.backToLogin') || 'Back to Login'}</Button>
        </div>
      </Card>
    </AuthScreen>
  );
}
