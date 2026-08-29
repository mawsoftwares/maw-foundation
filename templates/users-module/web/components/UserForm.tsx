import type { ReactNode } from 'react';
import { useState } from 'react';
import { Drawer, Form, Input, Select, Button, useToast } from '@mawsoftwares/ui-web';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '../../server/application/dto';

/**
 * Users Module Template — Create / Edit User Form
 *
 * ADD: project-specific form fields matching your User entity.
 *
 * Examples:
 *   HR: employeeCode, departmentId, designation, joiningDate
 *   Restaurant: waiterCode, outletId, cashierAccess, kitchenAccess
 */

interface UserFormProps {
  user?: UserResponseDto;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Replace with real API calls ────────────────────────────────────────────
async function createUser(_data: CreateUserDto): Promise<void> { /* POST /api/v1/users */ }
async function updateUser(_id: string, _data: UpdateUserDto): Promise<void> { /* PATCH /api/v1/users/:id */ }

const ROLE_OPTIONS = [
  { value: 'viewer',  label: 'Viewer' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner',   label: 'Owner' },
  // ADD project-specific roles here
];

export function UserForm({ user, onClose, onSuccess }: UserFormProps): ReactNode {
  const { addToast } = useToast();
  const isEdit = user !== undefined;

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '');
  const [email,     setEmail]     = useState(user?.email     ?? '');
  const [phone,     setPhone]     = useState(user?.phone     ?? '');
  const [role,      setRole]      = useState(user?.role      ?? 'viewer');
  const [password,  setPassword]  = useState('');
  const [saving,    setSaving]    = useState(false);

  // ADD: project-specific state fields here

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      addToast({ type: 'error', message: 'First name, last name and email are required' });
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const updates: UpdateUserDto = {
          firstName: firstName.trim(),
          lastName:  lastName.trim(),
          email:     email.trim(),
          phone:     phone.trim() || undefined,
          role,
          // ADD project-specific update fields here
        };
        await updateUser(user.id, updates);
      } else {
        const input: CreateUserDto = {
          tenantId:  '',   // injected by the API adapter
          firstName: firstName.trim(),
          lastName:  lastName.trim(),
          email:     email.trim(),
          phone:     phone.trim() || undefined,
          password:  password || undefined,
          role,
          // ADD project-specific create fields here
        };
        await createUser(input);
      }
      addToast({ type: 'success', message: isEdit ? 'User updated' : 'User created' });
      onSuccess();
    } catch {
      addToast({ type: 'error', message: 'Failed to save user' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open title={isEdit ? 'Edit User' : 'New User'} onClose={onClose} width={480}>
      <Form onSubmit={(e) => void handleSubmit(e)}>
        <Input
          id="user-first-name"
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          autoFocus
        />
        <Input
          id="user-last-name"
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <Input
          id="user-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="user-phone"
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Select
          id="user-role"
          label="Role"
          value={role}
          onChange={(v) => setRole(v)}
          options={ROLE_OPTIONS}
        />
        {!isEdit && (
          <Input
            id="user-password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to set later"
          />
        )}

        {/* ADD project-specific form fields here */}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
