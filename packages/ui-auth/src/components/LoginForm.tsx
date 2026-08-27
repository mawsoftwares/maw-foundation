import { type ReactNode } from 'react';
import { Button, Card, TextField, useAuth, useForm, FormField, useToast } from '@mawsoftwares/ui-web';
import { useAuthT } from '../useAuthT';

export interface LoginFormProps {
  readonly onSwitchToRegister?: () => void;
  readonly onSwitchToForgot?: (email: string) => void;
  readonly onSwitchToVerify?: () => void;
  readonly title?: string;
  readonly subtitle?: string;
  readonly defaultEmail?: string;
}

export function LoginForm({
  onSwitchToRegister,
  onSwitchToForgot,
  onSwitchToVerify,
  title = 'Sign In',
  subtitle = 'Please enter your credentials to continue',
  defaultEmail = 'mindsatworksolutions@gmail.com',
}: LoginFormProps = {}): ReactNode {
  const { login } = useAuth();
  const t = useAuthT();
  const toast = useToast();

  const form = useForm({
    initialValues: { email: defaultEmail, password: 'password123' },
    fields: {
      email: { required: true },
      password: { required: true },
    },
    onSubmit: async (values) => {
      try {
        await login({ email: values.email, password: values.password });
        toast.success(t('auth.loggedIn') || 'Logged in');
      } catch (err) {
        const msg = err instanceof Error ? err.message : (t('auth.invalidCredentials') || 'Invalid email or password');
        toast.error(msg);
        form.setError('email', msg);
      }
    },
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
      <Card style={{ width: 400, maxWidth: '90vw' }}>
        <h2 style={{ marginTop: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-xl)', fontWeight: 700 }}>
          {title}
        </h2>
        <p style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)', marginTop: 0, marginBottom: 'var(--maw-space-lg)' }}>
          {subtitle}
        </p>

        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label={t('auth.email') || 'Email'} error={form.getFieldProps('email').error} required>
            <TextField
              value={form.values.email}
              onChange={form.getFieldProps('email').onChange}
              onBlur={form.getFieldProps('email').onBlur}
            />
          </FormField>

          <FormField label={t('auth.password') || 'Password'} error={form.getFieldProps('password').error} required>
            <TextField
              type="password"
              value={form.values.password}
              onChange={form.getFieldProps('password').onChange}
              onBlur={form.getFieldProps('password').onBlur}
            />
          </FormField>

          <Button type="submit" disabled={form.submitting} style={{ width: '100%', marginTop: 'var(--maw-space-md)' }}>
            {form.submitting ? (t('common.loading') || 'Loading...') : (t('auth.login') || 'Sign In')}
          </Button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--maw-space-md)' }}>
          {onSwitchToRegister && (
            <Button variant="ghost" onClick={onSwitchToRegister} style={{ fontSize: 'var(--maw-text-xs)' }}>
              {t('auth.createAccount') || 'Create account'}
            </Button>
          )}
          {onSwitchToForgot && (
            <Button variant="ghost" onClick={() => onSwitchToForgot(form.values.email)} style={{ fontSize: 'var(--maw-text-xs)' }}>
              {t('auth.forgotPassword') || 'Forgot password?'}
            </Button>
          )}
        </div>
        {onSwitchToVerify && (
          <div style={{ textAlign: 'center', marginTop: 'var(--maw-space-sm)' }}>
            <Button variant="ghost" onClick={onSwitchToVerify} style={{ fontSize: 'var(--maw-text-xs)' }}>
              {t('auth.haveVerificationToken') || 'I have a verification code'}
            </Button>
          </div>
        )}

        <div style={{ marginTop: 'var(--maw-space-lg)', padding: 'var(--maw-space-md)', background: 'var(--maw-bgMuted)', borderRadius: 'var(--maw-radius-md)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
          <strong>Test accounts</strong><br />
          superadmin@demo.test · owner@demo.test · manager@demo.test · clerk@demo.test<br />
          Also: mindsatworksolutions@gmail.com · poonamdhomane89@gmail.com<br />
          Password: <code>password123</code>
        </div>
      </Card>
    </div>
  );
}
