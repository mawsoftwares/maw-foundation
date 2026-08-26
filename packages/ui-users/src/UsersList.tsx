import { useMemo } from 'react';
import { DataGrid, useCrud, type UseCrudReturn, Button } from '@maw/ui-web';
import type { DataGridSchema } from '@maw/sdk';
import type { UserResponseDto } from '@maw/users';

export interface UsersListProps {
  crud: UseCrudReturn<UserResponseDto>;
  onCreate: () => void;
  onView: (id: string) => void;
}

export function UsersList({ crud, onCreate, onView }: UsersListProps) {
  const schema = useMemo<DataGridSchema<UserResponseDto>>(() => ({
    id: 'users-list',
    keyField: 'id',
    title: 'Users',
    description: 'Manage all users in this tenant',
    search: {
      enabled: true,
      placeholder: 'Search by name or email...',
    },
    pagination: {
      defaultPageSize: 20,
    },
    columns: [
      {
        id: 'name',
        field: 'firstName',
        header: 'Name',
        sortable: true,
        render: (user) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-sm)' }}>
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--maw-brand-bgMuted)', color: 'var(--maw-brand-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                {user.firstName[0]}
              </div>
            )}
            <span>{user.firstName} {user.lastName}</span>
          </div>
        )
      },
      { id: 'email', field: 'email', header: 'Email', sortable: true },
      { id: 'phone', field: 'phone', header: 'Phone' },
      { 
        id: 'status', 
        field: 'status',
        header: 'Status', 
        sortable: true,
        render: (user) => (
          <span style={{ 
            padding: '2px 8px', 
            borderRadius: 12, 
            fontSize: 'var(--maw-text-xs)', 
            fontWeight: 600,
            backgroundColor: user.status === 'ACTIVE' ? 'var(--maw-success-bgMuted)' : 'var(--maw-danger-bgMuted)',
            color: user.status === 'ACTIVE' ? 'var(--maw-success-fg)' : 'var(--maw-danger-fg)'
          }}>
            {user.status.toUpperCase()}
          </span>
        )
      },
    ],
    rowActions: [
      {
        id: 'view',
        label: 'View',
        handler: (user) => onView(user.id),
      }
    ],
    empty: {
      title: 'No users found',
      message: 'There are no users matching your criteria.',
    }
  }), [onView]);

  // We map the `useCrud` return values to the DataGrid's expected `ClientDataSourceConfig` format
  // since `useCrud` already handles fetching and state.
  const dataSource = useMemo(() => ({
    data: crud.items,
    loading: crud.loading,
    total: crud.total,
    // When DataGrid requests data changes, we forward them to our crud hook
    onLoad: async (req: any) => {
      if (req.search !== undefined) crud.setFilter({ ...crud.filter, search: req.search });
      if (req.sort) crud.setSort({ field: req.sort.field, direction: req.sort.direction });
      if (req.pagination) crud.setPage(req.pagination.page);
      return { data: crud.items, total: crud.total };
    }
  }), [crud]);

  return (
    <div style={{ padding: 'var(--maw-space-xl)' }}>
      <DataGrid
        schema={schema}
        dataSource={dataSource}
        headerActions={<Button onClick={onCreate}>New User</Button>}
      />
    </div>
  );
}
