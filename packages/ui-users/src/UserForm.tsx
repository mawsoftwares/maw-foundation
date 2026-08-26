import { useMemo } from 'react';
import { DynamicForm } from '@maw/ui-web';
import type { FormSchema } from '@maw/sdk';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '@maw/users';

export interface UserFormProps {
  initialData?: UserResponseDto | null;
  onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ initialData, onSave, onCancel }: UserFormProps) {
  const isEditing = !!initialData;

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
        colSpan: 2,
      },
      ...(isEditing ? [] : [
        {
          name: 'password',
          type: 'password' as const,
          label: 'Password',
          required: true,
          colSpan: 2,
        }
      ]),
    ],
  }), [isEditing]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const data: any = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || undefined,
    };

    if (!isEditing && values.password) {
      data.password = values.password;
    }

    if (!isEditing) {
      data.tenantId = 'tenant-1';
    }

    await onSave(data);
  };

  return (
    <DynamicForm
      schema={schema}
      initialValues={(initialData as any) ?? {}}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={isEditing ? 'Save Changes' : 'Create'}
    />
  );
}
