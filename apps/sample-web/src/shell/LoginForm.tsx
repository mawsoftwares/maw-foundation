import { type ReactNode } from 'react';
import { Button, Card, TextField, useAuth, useForm, FormField, useI18n, useToast } from '@maw/ui-web';

interface LoginFormProps {
  readonly onSwitchToRegister?: () => void;
  readonly onSwitchToForgot?: () => void;
}

export function LoginForm({ onSwitchToRegister, onSwitchToForgot }: LoginFormProps = {}): ReactNode {
  const { login } = useAuth();
  const { t } = useI18n();
  const toast = useToast();

  const form = useForm({
    initialValues: { email: 'owner@demo.test', password: 'password123' },
    fields: {
      email: { required: true },
      password: { required: true },
    },
    onSubmit: async (values) => {
      try {
        await login({ email: values.email, password: values.password });
        toast.success('Logged in');
      } catch {
        toast.error(t('auth.invalidCredentials'));
        form.setError('email', t('auth.invalidCredentials'));
      }
    },
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
      <Card style={{ width: 400, maxWidth: '90vw' }}>
        <h2 style={{ marginTop: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-xl)', fontWeight: 700 }}>
          {t('auth.login')}
        </h2>
        <p style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)', marginTop: 0, marginBottom: 'var(--maw-space-lg)' }}>
          MAW Foundation — Sample Web App
        </p>

        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label={t('auth.email')} error={form.getFieldProps('email').error} required>
            <TextField
              value={form.values.email}
              onChange={form.getFieldProps('email').onChange}
              onBlur={form.getFieldProps('email').onBlur}
            />
          </FormField>

          <FormField label={t('auth.password')} error={form.getFieldProps('password').error} required>
            <TextField
              type="password"
              value={form.values.password}
              onChange={form.getFieldProps('password').onChange}
              onBlur={form.getFieldProps('password').onBlur}
            />
          </FormField>

          <Button type="submit" disabled={form.submitting} style={{ width: '100%', marginTop: 'var(--maw-space-md)' }}>
            {form.submitting ? t('common.loading') : t('auth.login')}
          </Button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--maw-space-md)' }}>
          {onSwitchToRegister && (
            <Button variant="ghost" onClick={onSwitchToRegister} style={{ fontSize: 'var(--maw-text-xs)' }}>
              Create account
            </Button>
          )}
          {onSwitchToForgot && (
            <Button variant="ghost" onClick={onSwitchToForgot} style={{ fontSize: 'var(--maw-text-xs)' }}>
              Forgot password?
            </Button>
          )}
        </div>

        <div style={{ marginTop: 'var(--maw-space-lg)', padding: 'var(--maw-space-md)', background: 'var(--maw-bgMuted)', borderRadius: 'var(--maw-radius-md)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
          <strong>Test accounts:</strong><br />
          superadmin@ / owner@ / manager@ / clerk@demo.test<br />
          Password: <code>password123</code>
        </div>
      </Card>
    </div>
  );
}
