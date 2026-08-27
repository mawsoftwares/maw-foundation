import { useState, type ReactNode } from 'react';
import { Button, Card, TextField, useForm, FormField, useToast, Alert } from '@mawsoftwares/ui-web';
import { ApiClient } from '@mawsoftwares/api-client';
import { useAuthT } from '../useAuthT';

export interface ChangePasswordFormProps {
  readonly client: ApiClient;
}

export function ChangePasswordForm({ client }: ChangePasswordFormProps): ReactNode {
  const toast = useToast();
  const t = useAuthT();
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
        form.setError('confirmPassword', t('auth.passwordsMismatch'));
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
        toast.success(t('auth.passwordChanged'));
        form.reset();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('auth.changeFailed');
        toast.error(msg);
        form.setError('currentPassword', msg);
      }
    },
  });

  return (
    <Card>
      <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>{t('auth.changePassword')}</h3>
      {success && <Alert variant="success" style={{ marginBottom: 'var(--maw-space-md)' }}>{t('auth.passwordUpdated')}</Alert>}
      <form onSubmit={(e) => { e.preventDefault(); setSuccess(false); form.handleSubmit(); }}>
        <FormField label={t('auth.currentPassword')} error={form.getFieldProps('currentPassword').error} required>
          <TextField type="password" value={form.values.currentPassword} onChange={form.getFieldProps('currentPassword').onChange} onBlur={form.getFieldProps('currentPassword').onBlur} />
        </FormField>
        <FormField label={t('auth.newPassword')} error={form.getFieldProps('newPassword').error} required>
          <TextField type="password" value={form.values.newPassword} onChange={form.getFieldProps('newPassword').onChange} onBlur={form.getFieldProps('newPassword').onBlur} />
        </FormField>
        <FormField label={t('auth.confirmNewPassword')} error={form.getFieldProps('confirmPassword').error} required>
          <TextField type="password" value={form.values.confirmPassword} onChange={form.getFieldProps('confirmPassword').onChange} onBlur={form.getFieldProps('confirmPassword').onBlur} />
        </FormField>
        <Button type="submit" disabled={form.submitting} style={{ marginTop: 'var(--maw-space-md)' }}>
          {form.submitting ? t('common.loading') : t('auth.changePassword')}
        </Button>
      </form>
    </Card>
  );
}
