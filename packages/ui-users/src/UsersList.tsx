import { useMemo, type ReactNode } from 'react';
import {
  ListPage,
  DataTable,
  Badge,
  Button,
  Avatar,
  ErrorState,
  useDynamicAccess,
  type ColumnDef,
  type UseCrudReturn,
} from '@mawsoftwares/ui-web';
import type { UserResponseDto } from '@mawsoftwares/users';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';

export interface UsersListProps {
  crud: UseCrudReturn<UserResponseDto>;
  onCreate: () => void;
  onView: (id: string) => void;
}

function statusVariant(status: AccountStatusValue): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING_VERIFICATION') return 'warning';
  if (status === 'SUSPENDED' || status === 'LOCKED' || status === 'DISABLED') return 'danger';
  return 'default';
}

function displayName(user: UserResponseDto): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name.length > 0 ? name : user.email;
}

export function UsersList({ crud, onCreate, onView }: UsersListProps): ReactNode {
  const { can } = useDynamicAccess();
  const canCreate = can('Create_Users');

  const columns = useMemo<ColumnDef<UserResponseDto>[]>(() => [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (user) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-sm)' }}>
          <Avatar src={user.avatar} name={displayName(user)} size={32} />
          <span style={{ fontWeight: 600, color: 'var(--maw-fg)' }}>{displayName(user)}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'phone',
      header: 'Phone',
      render: (user) => user.phone ?? '—',
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (user) => user.role !== undefined && user.role.length > 0
        ? <Badge>{user.role}</Badge>
        : '—',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: 160,
      render: (user) => (
        <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
      ),
    },
  ], []);

  if (crud.error !== undefined) {
    return <ErrorState title="Failed to load users" message={crud.error} retry={crud.refresh} />;
  }

  return (
    <ListPage
      title="Users"
      description={`${crud.total} users`}
      createLabel="New User"
      onCreate={canCreate ? onCreate : undefined}
      filter={crud.filter}
      onFilterChange={crud.setFilter}
      searchPlaceholder="Search by name or email..."
    >
      <DataTable
        columns={columns}
        data={crud.items}
        keyField="id"
        sort={crud.sort}
        onSort={crud.setSort}
        pagination={{ page: crud.page, pageSize: crud.pageSize, total: crud.total }}
        onPageChange={crud.setPage}
        onPageSizeChange={crud.setPageSize}
        loading={crud.loading}
        emptyMessage="No users found"
        stickyHeader
        onRowClick={(row) => onView(row.id)}
        rowActions={(row) => (
          <Button
            variant="ghost"
            onClick={() => onView(row.id)}
            style={{ fontSize: 'var(--maw-text-xs)', padding: '4px 10px' }}
          >
            View
          </Button>
        )}
      />
    </ListPage>
  );
}
