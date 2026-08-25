import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, useForm, FormField, useToast, Alert } from '@maw/ui-web';
import { client } from '../api';

interface ResetPasswordFormProps {
  readonly onSwitchToLogin: () => void;
}

export function ResetPasswordForm({ onSwitchToLogin }: ResetPasswordFormProps): ReactNode {
  const toast = useToast();
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: { token: '', newPassword: '', confirmPassword: '' },
    fields: {
      token: { required: true },
      newPassword: { required: true },
      confirmPassword: { required: true },
    },
    onSubmit: async (values) => {
      if (values.newPassword !== values.confirmPassword) {
        form.setError('confirmPassword', 'Passwords do not match');
        return;
      }
      try {
        await client.request('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token: values.token, newPassword: values.newPassword }),
          headers: { 'Content-Type': 'application/json' },
        });
        setSuccess(true);
        toast.success('Password has been reset successfully!');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Reset failed';
        toast.error(msg);
        form.setError('token', msg);
      }
    },
  });

  if (success) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
        <Card style={{ width: 400, maxWidth: '90vw', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Password Reset</h2>
          <Alert variant="success">Your password has been successfully reset. You can now sign in with your new password.</Alert>
          <Button onClick={onSwitchToLogin} style={{ marginTop: 'var(--maw-space-lg)' }}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--maw-bgSubtle)' }}>
      <Card style={{ width: 420, maxWidth: '90vw' }}>
        <h2 style={{ marginTop: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-xl)', fontWeight: 700 }}>
          Reset Password
        </h2>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <FormField label="Reset Token" error={form.getFieldProps('token').error} required>
            <TextField
              value={form.values.token}
              onChange={form.getFieldProps('token').onChange}
              onBlur={form.getFieldProps('token').onBlur}
              placeholder="Paste the token from your email"
            />
          </FormField>
          <FormField label="New Password" error={form.getFieldProps('newPassword').error} required>
            <TextField
              type="password"
              value={form.values.newPassword}
              onChange={form.getFieldProps('newPassword').onChange}
              onBlur={form.getFieldProps('newPassword').onBlur}
            />
          </FormField>
          <FormField label="Confirm Password" error={form.getFieldProps('confirmPassword').error} required>
            <TextField
              type="password"
              value={form.values.confirmPassword}
              onChange={form.getFieldProps('confirmPassword').onChange}
              onBlur={form.getFieldProps('confirmPassword').onBlur}
            />
          </FormField>
          <Button type="submit" disabled={form.submitting} style={{ width: '100%', marginTop: 'var(--maw-space-md)' }}>
            {form.submitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 'var(--maw-space-lg)' }}>
          <Button variant="ghost" onClick={onSwitchToLogin}>Back to Login</Button>
        </div>
      </Card>
    </div>
  );
}
