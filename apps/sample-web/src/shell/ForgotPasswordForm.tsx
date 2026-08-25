import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, useForm, FormField, useToast, Alert } from '@maw/ui-web';
import { client } from '../api';

interface ForgotPasswordFormProps {
  readonly onSwitchToLogin: () => void;
  readonly onResetReady: () => void;
}

export function ForgotPasswordForm({ onSwitchToLogin, onResetReady }: ForgotPasswordFormProps): ReactNode {
  const toast = useToast();
  const [sent, setSent] = useState(false);

  const form = useForm({
    initialValues: { email: '' },
    fields: { email: { required: true } },
    onSubmit: async (values) => {
      try {
        await client.request('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: values.email, tenantId: 'demo-tenant' }),
          headers: { 'Content-Type': 'application/json' },
        });
        setSent(true);
        toast.success('If an account exists, a reset email has been sent.');
      } catch {
        setSent(true);
        toast.success('If an account exists, a reset email has been sent.');
      }
    },
  });

  if (sent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
        <Card style={{ width: 400, maxWidth: '90vw', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Check Your Email</h2>
          <Alert variant="info">
            If an account with that email exists, we have sent a password reset link. Check your inbox.
          </Alert>
          <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'center', marginTop: 'var(--maw-space-lg)' }}>
            <Button variant="ghost" onClick={onSwitchToLogin}>Back to Login</Button>
            <Button onClick={onResetReady}>I have a reset token</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
      <Card style={{ width: 400, maxWidth: '90vw' }}>
        <h2 style={{ marginTop: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-xl)', fontWeight: 700 }}>
          Forgot Password
        </h2>
        <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
          Enter your email and we will send you a reset link.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label="Email" error={form.getFieldProps('email').error} required>
            <TextField
              value={form.values.email}
              onChange={form.getFieldProps('email').onChange}
              onBlur={form.getFieldProps('email').onBlur}
              placeholder="you@example.com"
            />
          </FormField>
          <Button type="submit" disabled={form.submitting} style={{ width: '100%', marginTop: 'var(--maw-space-md)' }}>
            {form.submitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 'var(--maw-space-lg)' }}>
          <Button variant="ghost" onClick={onSwitchToLogin}>Back to Login</Button>
        </div>
      </Card>
    </div>
  );
}
