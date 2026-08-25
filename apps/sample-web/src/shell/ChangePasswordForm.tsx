import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, useForm, FormField, useToast, Alert } from '@maw/ui-web';
import { client } from '../api';

export function ChangePasswordForm(): ReactNode {
  const toast = useToast();
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    fields: {
      currentPassword: { required: true },
      newPassword: { required: true },
      confirmPassword: { required: true },
    },
    onSubmit: async (values) => {
      if (values.newPassword !== values.confirmPassword) {
        form.setError('confirmPassword', 'Passwords do not match');
        return;
      }
      try {
        await client.request('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        setSuccess(true);
        toast.success('Password changed successfully');
        form.reset();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Change failed';
        toast.error(msg);
        form.setError('currentPassword', msg);
      }
    },
  });

  return (
    <Card>
      <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Change Password</h3>
      {success && <Alert variant="success" style={{ marginBottom: 'var(--maw-space-md)' }}>Password updated successfully.</Alert>}
      <form onSubmit={(e) => { e.preventDefault(); setSuccess(false); form.handleSubmit(); }}>
        <FormField label="Current Password" error={form.getFieldProps('currentPassword').error} required>
          <TextField type="password" value={form.values.currentPassword} onChange={form.getFieldProps('currentPassword').onChange} onBlur={form.getFieldProps('currentPassword').onBlur} />
        </FormField>
        <FormField label="New Password" error={form.getFieldProps('newPassword').error} required>
          <TextField type="password" value={form.values.newPassword} onChange={form.getFieldProps('newPassword').onChange} onBlur={form.getFieldProps('newPassword').onBlur} />
        </FormField>
        <FormField label="Confirm New Password" error={form.getFieldProps('confirmPassword').error} required>
          <TextField type="password" value={form.values.confirmPassword} onChange={form.getFieldProps('confirmPassword').onChange} onBlur={form.getFieldProps('confirmPassword').onBlur} />
        </FormField>
        <Button type="submit" disabled={form.submitting} style={{ marginTop: 'var(--maw-space-md)' }}>
          {form.submitting ? 'Changing...' : 'Change Password'}
        </Button>
      </form>
    </Card>
  );
}
