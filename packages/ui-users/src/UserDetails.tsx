import { useMemo, useState, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Grid,
  IconButton,
  Panel,
  ProfileAvatarUpload,
  Select,
  Stack,
  TextField,
  useDynamicAccess,
  useForm,
} from '@mawsoftwares/ui-web';
import { email, phone } from '@mawsoftwares/sdk/kernel/validate';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';
import type { UpdateUserDto, UserResponseDto } from '@mawsoftwares/users';
import type { RoleOption } from './types';

export interface UserDetailsProps {
  user: UserResponseDto;
  onBack: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onSave: (data: UpdateUserDto) => Promise<void>;
  roles?: readonly RoleOption[];
  uploadAvatar?: (file: File, onProgress: (percent: number) => void) => Promise<StoredFile>;
}

interface UserEditValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  [key: string]: unknown;
}

function statusVariant(status: AccountStatusValue): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING_VERIFICATION') return 'warning';
  if (status === 'SUSPENDED' || status === 'LOCKED' || status === 'DISABLED') return 'danger';
  return 'default';
}

function displayName(firstName: string, lastName: string, emailAddress: string): string {
  const name = `${firstName} ${lastName}`.trim();
  return name.length > 0 ? name : emailAddress;
}

function valuesFromUser(user: UserResponseDto): UserEditValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? '',
    role: user.role ?? '',
  };
}

function formatTimestamp(value: string | undefined): string {
  if (value === undefined || value.length === 0) return '—';
  return new Date(value).toLocaleString();
}

function ReadValue({ label, value }: { readonly label: string; readonly value: ReactNode }): ReactNode {
  return (
    <div>
      <div
        style={{
          fontSize: 'var(--maw-text-xs)',
          fontWeight: 600,
          color: 'var(--maw-fgSubtle)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 'var(--maw-space-xs)',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500, color: 'var(--maw-fg)', minHeight: 24 }}>
        {value === undefined || value === null || value === ''
          ? <span style={{ color: 'var(--maw-fgSubtle)' }}>—</span>
          : value}
      </div>
    </div>
  );
}

export function UserDetails(props: UserDetailsProps): ReactNode {
  return <UserProfileEditor key={props.user.id} {...props} />;
}

function UserProfileEditor({
  user,
  onBack,
  onDelete,
  onActivate,
  onDeactivate,
  onSave,
  roles = [],
  uploadAvatar,
}: UserDetailsProps): ReactNode {
  const { can } = useDynamicAccess();
  const canUpdate = can('Update_Users');
  const canDelete = can('Delete_Users');

  const [editing, setEditing] = useState(false);
  const [actionLoading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatar);
  const [avatarError, setAvatarError] = useState<string | undefined>();

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.code, label: r.name })),
    [roles],
  );

  const fields = useMemo(() => ({
    firstName: { required: true },
    lastName: { required: true },
    email: {
      required: true,
      validate: (value: unknown) => {
        const result = email(String(value ?? ''));
        return result.valid ? undefined : result.error;
      },
    },
    phone: {
      validate: (value: unknown) => {
        const str = String(value ?? '').trim();
        if (str.length === 0) return undefined;
        const result = phone(str);
        return result.valid ? undefined : result.error;
      },
    },
    role: roleOptions.length > 0 ? { required: true } : {},
  }), [roleOptions.length]);

  const form = useForm<UserEditValues>({
    initialValues: valuesFromUser(user),
    fields,
    onSubmit: async (values) => {
      const data: UpdateUserDto = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        avatar: avatarUrl,
        role: values.role.length > 0 ? values.role : undefined,
      };
      await onSave(data);
      setEditing(false);
    },
  });

  const startEdit = () => {
    form.reset(valuesFromUser(user));
    setAvatarUrl(user.avatar);
    setAvatarError(undefined);
    setEditing(true);
  };

  const cancelEdit = () => {
    form.reset(valuesFromUser(user));
    setAvatarUrl(user.avatar);
    setAvatarError(undefined);
    setEditing(false);
  };

  const handleAction = async (action: () => Promise<void> | void) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const isActive = user.status === 'ACTIVE';
  const avatarDirty = (avatarUrl ?? '') !== (user.avatar ?? '');
  const canSave = (form.dirty || avatarDirty) && form.valid && !form.submitting;
  const busy = actionLoading || form.submitting;

  const firstName = editing ? form.values.firstName : user.firstName;
  const lastName = editing ? form.values.lastName : user.lastName;
  const emailAddress = editing ? form.values.email : user.email;
  const name = displayName(firstName, lastName, emailAddress);
  const roleLabel = roleOptions.find((r) => r.value === (editing ? form.values.role : user.role))?.label
    ?? user.role
    ?? '—';

  const firstNameField = form.getFieldProps('firstName');
  const lastNameField = form.getFieldProps('lastName');
  const emailField = form.getFieldProps('email');
  const phoneField = form.getFieldProps('phone');

  return (
    <div className="maw-fade-in" style={{ fontFamily: 'var(--maw-font-family)' }}>
      <Stack direction="row" align="center" justify="space-between" style={{ marginBottom: 'var(--maw-space-lg)' }}>
        <Stack direction="row" align="center" gap="var(--maw-space-sm)">
          <IconButton label="Go back" onClick={onBack} disabled={busy}>←</IconButton>
          <span style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 600, color: 'var(--maw-fgMuted)' }}>
            {editing ? 'Edit user' : 'User details'}
          </span>
        </Stack>
        <Stack direction="row" gap="var(--maw-space-sm)" align="center">
          {editing ? (
            <>
              <Button type="button" variant="ghost" disabled={busy} onClick={cancelEdit}>
                Cancel
              </Button>
              <Button type="submit" form="user-profile-form" disabled={!canSave}>
                {form.submitting ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          ) : (
            <>
              {canUpdate && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => handleAction(isActive ? onDeactivate : onActivate)}
                >
                  {isActive ? 'Deactivate' : 'Activate'}
                </Button>
              )}
              {canUpdate && (
                <Button variant="ghost" disabled={busy} onClick={startEdit}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button variant="danger" disabled={busy} onClick={() => handleAction(onDelete)}>
                  Delete
                </Button>
              )}
            </>
          )}
        </Stack>
      </Stack>

      <Card>
        <Stack direction="row" align="center" gap="var(--maw-space-lg)" style={{ marginBottom: 'var(--maw-space-xl)' }}>
          {editing && uploadAvatar ? (
            <ProfileAvatarUpload
              src={avatarUrl}
              name={name}
              size={72}
              upload={uploadAvatar}
              onChange={(url) => {
                setAvatarUrl(url);
                setAvatarError(undefined);
              }}
              onError={setAvatarError}
            />
          ) : (
            <Avatar src={editing ? avatarUrl : user.avatar} name={name} size={72} />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'var(--maw-text-xl)',
                fontWeight: 700,
                color: 'var(--maw-fg)',
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </h1>
            <div
              style={{
                marginTop: 'var(--maw-space-xs)',
                fontSize: 'var(--maw-text-sm)',
                color: 'var(--maw-fgMuted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {emailAddress}
            </div>
            <Stack direction="row" gap="var(--maw-space-sm)" style={{ marginTop: 'var(--maw-space-sm)' }}>
              <Badge>{roleLabel}</Badge>
              <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
            </Stack>
            {editing && (
              <div style={{ marginTop: 'var(--maw-space-sm)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)' }}>
                Update the fields below, then save. Cancel discards unsaved changes.
              </div>
            )}
            {avatarError !== undefined && (
              <div style={{ marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-danger)' }}>
                {avatarError}
              </div>
            )}
          </div>
        </Stack>

        <form id="user-profile-form" onSubmit={form.handleSubmit} noValidate>
          <Stack gap="var(--maw-space-lg)">
            <Panel title="Profile">
              {editing ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    columnGap: 'var(--maw-space-lg)',
                  }}
                >
                  <TextField
                    name="firstName"
                    label="First name"
                    value={String(firstNameField.value ?? '')}
                    onChange={firstNameField.onChange}
                    onBlur={firstNameField.onBlur}
                    error={firstNameField.error}
                    autoComplete="given-name"
                  />
                  <TextField
                    name="lastName"
                    label="Last name"
                    value={String(lastNameField.value ?? '')}
                    onChange={lastNameField.onChange}
                    onBlur={lastNameField.onBlur}
                    error={lastNameField.error}
                    autoComplete="family-name"
                  />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <TextField
                      name="email"
                      type="email"
                      label="Email"
                      value={String(emailField.value ?? '')}
                      onChange={emailField.onChange}
                      onBlur={emailField.onBlur}
                      error={emailField.error}
                      autoComplete="email"
                    />
                  </div>
                  <TextField
                    name="phone"
                    type="tel"
                    label="Phone"
                    value={String(phoneField.value ?? '')}
                    onChange={phoneField.onChange}
                    onBlur={phoneField.onBlur}
                    error={phoneField.error}
                    autoComplete="tel"
                    placeholder="Optional"
                  />
                  {roleOptions.length > 0 ? (
                    <Select
                      name="role"
                      label="Role"
                      placeholder="Select a role"
                      options={roleOptions}
                      value={form.values.role}
                      onChange={(e) => form.setValue('role', e.target.value)}
                      onBlur={() => form.touch('role')}
                      error={form.touched.role ? form.errors.role : undefined}
                    />
                  ) : (
                    <ReadValue label="Role" value={roleLabel} />
                  )}
                </div>
              ) : (
                <Grid columns={{ xs: 1, sm: 2 }} gap="var(--maw-space-lg)">
                  <ReadValue label="First name" value={user.firstName} />
                  <ReadValue label="Last name" value={user.lastName} />
                  <ReadValue label="Email" value={user.email} />
                  <ReadValue label="Phone" value={user.phone} />
                  <ReadValue label="Role" value={roleLabel} />
                </Grid>
              )}
            </Panel>

            <Panel title="Account">
              <Grid columns={{ xs: 1, sm: 2 }} gap="var(--maw-space-lg)">
                <ReadValue label="User ID" value={user.id} />
                <ReadValue label="Status" value={<Badge variant={statusVariant(user.status)}>{user.status}</Badge>} />
                <ReadValue label="Created" value={formatTimestamp(user.createdAt)} />
                <ReadValue label="Last updated" value={formatTimestamp(user.updatedAt)} />
                <ReadValue label="Last login" value={formatTimestamp(user.lastLoginAt)} />
              </Grid>
            </Panel>
          </Stack>
        </form>
      </Card>
    </div>
  );
}
