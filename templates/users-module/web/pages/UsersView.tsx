import type { ReactNode } from 'react';
import { useState } from 'react';
import { ListPage, DataTable, Button, Badge, useToast } from '@mawsoftwares/ui-web';
import { useDynamicAccess } from '@mawsoftwares/ui-web';
import type { UserResponseDto } from '../../server/application/dto';
import { UserForm } from '../components/UserForm';

/**
 * Users Module Template — Users List Page
 *
 * Wire `useUsersApi()` to your actual API integration using @mawsoftwares/api-client.
 * Add/remove table columns to match your User entity fields.
 */

// ── Replace with real API hook ─────────────────────────────────────────────
function useUsersApi() {
  return {
    items: [] as UserResponseDto[],
    total: 0,
    isLoading: false,
    refetch: () => { /* GET /api/v1/users */ },
    deleteUser: async (_id: string) => { /* DELETE /api/v1/users/:id */ },
  };
}

export function UsersView(): ReactNode {
  const { can } = useDynamicAccess();
  const { addToast } = useToast();

  const canCreate = can('Create_Users');
  const canUpdate = can('Update_Users');
  const canDelete = can('Delete_Users');

  const { items, total, isLoading, refetch, deleteUser } = useUsersApi();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserResponseDto | undefined>();

  async function handleDelete(id: string) {
    try {
      await deleteUser(id);
      addToast({ type: 'success', message: 'User deleted' });
      refetch();
    } catch {
      addToast({ type: 'error', message: 'Failed to delete user' });
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (u: UserResponseDto) => `${u.firstName} ${u.lastName}`,
    },
    { key: 'email',  header: 'Email',  render: (u: UserResponseDto) => u.email },
    { key: 'role',   header: 'Role',   render: (u: UserResponseDto) => u.role ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (u: UserResponseDto) => (
        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {u.status}
        </Badge>
      ),
    },
    // ADD project-specific columns here (e.g. department, employee code)
    ...(canUpdate || canDelete ? [{
      key: 'actions',
      header: '',
      width: 120,
      render: (u: UserResponseDto) => (
        <span style={{ display: 'flex', gap: 4 }}>
          {canUpdate && (
            <Button variant="ghost" size="sm" onClick={() => { setEditUser(u); setShowForm(true); }}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              style={{ color: 'var(--maw-danger)', fontSize: 'var(--maw-text-xs)' }}
              onClick={() => void handleDelete(u.id)}
            >
              Delete
            </Button>
          )}
        </span>
      ),
    }] : []),
  ];

  return (
    <>
      <ListPage
        title="Users"
        createLabel="New User"
        onCreate={canCreate ? () => { setEditUser(undefined); setShowForm(true); } : undefined}
      >
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          emptyMessage="No users found."
          totalCount={total}
        />
      </ListPage>

      {showForm && (
        <UserForm
          user={editUser}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </>
  );
}
