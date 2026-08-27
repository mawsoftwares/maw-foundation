import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, useForm, FormField, useToast, Alert } from '@mawsoftwares/ui-web';
import { ApiClient } from '@mawsoftwares/api-client';
import { useAuthT } from '../useAuthT';

export interface RegisterFormProps {
  readonly client: ApiClient;
  readonly onSwitchToLogin: () => void;
  readonly onVerifyReady?: () => void;
  readonly tenantId: string;
}

export function RegisterForm({ client, onSwitchToLogin, onVerifyReady, tenantId }: RegisterFormProps): ReactNode {
  const toast = useToast();
  const t = useAuthT();
  const [verificationSent, setVerificationSent] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '', confirmPassword: '', name: '' },
    fields: {
      email: { required: true },
      password: { required: true },
      confirmPassword: { required: true },
      name: {},
    },
    onSubmit: async (values) => {
      if (values.password !== values.confirmPassword) {
        form.setError('confirmPassword', t('auth.passwordsMismatch') || 'Passwords do not match');
        return;
      }
      try {
        await client.request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            name: values.name || undefined,
            tenantId,
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        setVerificationSent(true);
        toast.success(t('auth.accountCreated') || 'Account created! Check your email to verify.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : (t('auth.registrationFailed') || 'Registration failed');
        toast.error(msg);
        form.setError('email', msg);
      }
    },
  });

  if (verificationSent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
        <Card style={{ width: 400, maxWidth: '90vw', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>{t('auth.verifyEmail') || 'Verify Your Email'}</h2>
          <Alert variant="info">
            {t('auth.verificationSent') || 'A verification link has been sent to your email address. Please check your inbox to activate your account.'}
          </Alert>
          <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'center', marginTop: 'var(--maw-space-lg)' }}>
            <Button variant="ghost" onClick={onSwitchToLogin}>
              {t('auth.backToLogin') || 'Back to Login'}
            </Button>
            {onVerifyReady && (
              <Button onClick={onVerifyReady}>
                {t('auth.haveVerificationToken') || 'I have a verification code'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
      <Card style={{ width: 420, maxWidth: '90vw' }}>
        <h2 style={{ marginTop: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-xl)', fontWeight: 700 }}>
          {t('auth.createAccount') || 'Create Account'}
        </h2>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label={t('auth.fullName') || 'Full Name'} error={form.getFieldProps('name').error}>
            <TextField
              value={form.values.name}
              onChange={form.getFieldProps('name').onChange}
              onBlur={form.getFieldProps('name').onBlur}
              placeholder="John Doe"
            />
          </FormField>
          <FormField label={t('auth.email') || 'Email'} error={form.getFieldProps('email').error} required>
            <TextField
              value={form.values.email}
              onChange={form.getFieldProps('email').onChange}
              onBlur={form.getFieldProps('email').onBlur}
              placeholder="you@example.com"
            />
          </FormField>
          <FormField
            label={t('auth.password') || 'Password'}
            error={form.getFieldProps('password').error}
            hint={t('auth.passwordHint') || 'At least 8 characters, with an uppercase letter and a number'}
            required
          >
            <TextField
              type="password"
              value={form.values.password}
              onChange={form.getFieldProps('password').onChange}
              onBlur={form.getFieldProps('password').onBlur}
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
            {form.submitting ? (t('common.loading') || 'Creating...') : (t('auth.createAccount') || 'Create Account')}
          </Button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 'var(--maw-space-lg)' }}>
          <Button variant="ghost" onClick={onSwitchToLogin}>
            {t('auth.alreadyHaveAccount') || 'Already have an account? Sign in'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
