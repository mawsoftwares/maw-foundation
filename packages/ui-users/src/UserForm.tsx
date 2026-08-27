import { useMemo, useState, type ReactNode } from 'react';
import { DynamicForm, ProfileAvatarUpload, Stack } from '@mawsoftwares/ui-web';
import type { FormSchema } from '@mawsoftwares/sdk';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '@mawsoftwares/users';
import type { RoleOption } from './types';

export interface UserFormProps {
  initialData?: UserResponseDto | null;
  onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  onCancel: () => void;
  roles?: readonly RoleOption[];
  uploadAvatar?: (file: File, onProgress: (percent: number) => void) => Promise<StoredFile>;
}

export function UserForm({
  initialData,
  onSave,
  onCancel,
  roles = [],
  uploadAvatar,
}: UserFormProps): ReactNode {
  const isEditing = !!initialData;
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialData?.avatar);
  const [avatarError, setAvatarError] = useState<string | undefined>();

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.code, label: r.name })),
    [roles],
  );

  const schema = useMemo<FormSchema>(() => ({
    id: 'user-form',
    title: isEditing ? 'Edit User' : 'Create User',
    description: isEditing ? 'Update the details for this user.' : 'Fill in the details to create a new user.',
    layout: {
      type: 'single',
      columns: 2,
    },
    fields: [
      {
        name: 'firstName',
        type: 'text',
        label: 'First Name',
        required: true,
        colSpan: 1,
      },
      {
        name: 'lastName',
        type: 'text',
        label: 'Last Name',
        required: true,
        colSpan: 1,
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        colSpan: 2,
      },
      {
        name: 'phone',
        type: 'phone',
        label: 'Phone Number',
        colSpan: roleOptions.length > 0 ? 1 : 2,
      },
      ...(roleOptions.length > 0
        ? [{
            name: 'role',
            type: 'select' as const,
            label: 'Role',
            required: true,
            colSpan: 1,
            options: roleOptions,
            placeholder: 'Select a role',
          }]
        : []),
      ...(isEditing
        ? []
        : [{
            name: 'password',
            type: 'password' as const,
            label: 'Password',
            required: true,
            colSpan: 2,
            hint: 'At least 8 characters',
          }]),
    ],
  }), [isEditing, roleOptions]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (isEditing) {
      const data: UpdateUserDto = {
        firstName: String(values.firstName ?? ''),
        lastName: String(values.lastName ?? ''),
        email: String(values.email ?? ''),
        phone: values.phone ? String(values.phone) : undefined,
        avatar: avatarUrl,
        role: values.role ? String(values.role) : undefined,
      };
      await onSave(data);
      return;
    }

    const data: CreateUserDto = {
      tenantId: 'demo-tenant',
      firstName: String(values.firstName ?? ''),
      lastName: String(values.lastName ?? ''),
      email: String(values.email ?? ''),
      phone: values.phone ? String(values.phone) : undefined,
      password: values.password ? String(values.password) : undefined,
      role: values.role ? String(values.role) : undefined,
      avatar: avatarUrl,
    };
    await onSave(data);
  };

  return (
    <Stack gap="var(--maw-space-lg)">
      {uploadAvatar && (
        <div>
          <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: 'var(--maw-fg)', marginBottom: 'var(--maw-space-sm)' }}>
            Profile image
          </div>
          <ProfileAvatarUpload
            src={avatarUrl}
            name={initialData ? `${initialData.firstName} ${initialData.lastName}` : 'New User'}
            size={88}
            upload={uploadAvatar}
            onChange={(url) => {
              setAvatarUrl(url);
              setAvatarError(undefined);
            }}
            onError={setAvatarError}
          />
          {avatarError && (
            <div style={{ marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-danger)' }}>
              {avatarError}
            </div>
          )}
        </div>
      )}

      <DynamicForm
        schema={schema}
        initialValues={{
          ...(initialData ?? {}),
          role: initialData?.role ?? roleOptions[0]?.value,
        }}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        submitLabel={isEditing ? 'Save Changes' : 'Create'}
      />
    </Stack>
  );
}
