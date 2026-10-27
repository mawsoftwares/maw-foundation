import { useEffect, useState } from 'react';
import { Overlay, ConfirmationDialog, useDynamicAccess } from '@mawsoftwares/ui-web';
import type { SortState } from '@mawsoftwares/ui-web';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';
import type { UserResponseDto, CreateUserDto, UpdateUserDto, RoleOption } from './types';
import { usePagePath } from '../../../page-paths';
import { UsersList } from './UsersList';
import { UserForm } from './UserForm';
import { UserDetails } from './UserDetails';
import {
  useListUsersQuery,
  useGetUserQuery,
  useListRolesQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
} from '../usersApi';

export interface UsersManagerProps {
  formLayout?: 'page' | 'drawer' | 'modal';
  uploadAvatar?: (file: File, onProgress: (percent: number) => void) => Promise<StoredFile>;
}

type ViewState = 'list' | 'create' | 'details';

function useDebounced(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function errorMessage(error: unknown): string | undefined {
  if (error == null || typeof error !== 'object') return undefined;
  const message = 'message' in error ? error.message : undefined;
  return typeof message === 'string' && message.length > 0 ? message : 'Request failed';
}

export function UsersManager({ formLayout = 'page', uploadAvatar }: UsersManagerProps) {
  // The URL is the source of truth: /users (list), /users/new (create), /users/:id (details).
  const { segments, setSegments } = usePagePath('users');
  const { can } = useDynamicAccess();
  const first = segments[0];
  const view: ViewState = first === undefined ? 'list' : first === 'new' ? (can('Create_Users') ? 'create' : 'list') : 'details';
  const selectedId = view === 'details' && first !== undefined ? first : null;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionConfirm, setActionConfirm] = useState<{ type: 'activate' | 'deactivate'; id: string } | null>(null);
  const debouncedSearch = useDebounced(search, 250);

  const listQuery = useListUsersQuery(
    {
      page,
      pageSize,
      search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    },
    { refetchOnMountOrArgChange: true },
  );
  const rolesQuery = useListRolesQuery();
  const userQuery = useGetUserQuery(selectedId ?? '', {
    skip: selectedId === null || view !== 'details',
  });

  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [activateUser] = useActivateUserMutation();
  const [deactivateUser] = useDeactivateUserMutation();

  const items = listQuery.data?.items ?? [];
  const roles: readonly RoleOption[] = rolesQuery.data ?? [];
  const selectedFromList = selectedId === null ? null : items.find((user) => user.id === selectedId) ?? null;
  const selectedUser: UserResponseDto | null = userQuery.data ?? selectedFromList;

  const formProps = { roles, uploadAvatar };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleCreateNew = () => setSegments(['new']);

  const handleViewDetails = (id: string) => setSegments([id]);

  const handleBackToList = (replace = false) => setSegments([], { replace });

  const handleCreate = async (data: CreateUserDto | UpdateUserDto) => {
    await createUser(data as CreateUserDto).unwrap();
    handleBackToList(true);
  };

  const handleUpdate = async (data: UpdateUserDto) => {
    if (selectedId === null) return;
    await updateUser({ id: selectedId, data }).unwrap();
  };

  const handleDelete = async () => {
    if (selectedId === null) return;
    const confirm = window.confirm('Are you sure you want to delete this user?');
    if (!confirm) return;
    await deleteUser(selectedId).unwrap();
    handleBackToList(true);
  };

  const handleConfirmAction = async () => {
    if (actionConfirm === null) return;
    if (actionConfirm.type === 'activate') {
      await activateUser(actionConfirm.id).unwrap();
    } else {
      await deactivateUser(actionConfirm.id).unwrap();
    }
    setActionConfirm(null);
  };

  const isOverlayLayout = formLayout === 'drawer' || formLayout === 'modal';

  const detailsNode = selectedUser ? (
    <UserDetails
      user={selectedUser}
      onBack={() => handleBackToList()}
      onDelete={handleDelete}
      onActivate={() => setActionConfirm({ type: 'activate', id: selectedUser.id })}
      onDeactivate={() => setActionConfirm({ type: 'deactivate', id: selectedUser.id })}
      onSave={handleUpdate}
      {...formProps}
    />
  ) : null;

  const listNode = (
    <UsersList
      items={items}
      total={listQuery.data?.total ?? 0}
      loading={listQuery.isFetching}
      error={items.length === 0 ? errorMessage(listQuery.error) : undefined}
      page={page}
      pageSize={pageSize}
      sort={sort}
      filter={search}
      onPageChange={setPage}
      onPageSizeChange={handlePageSizeChange}
      onSort={setSort}
      onFilterChange={handleSearchChange}
      onRetry={() => { void listQuery.refetch(); }}
      onCreate={handleCreateNew}
      onView={handleViewDetails}
      statusFilter={statusFilter}
      onStatusFilterChange={handleStatusFilterChange}
      onActivate={(id) => setActionConfirm({ type: 'activate', id })}
      onDeactivate={(id) => setActionConfirm({ type: 'deactivate', id })}
    />
  );

  return (
    <>
      {isOverlayLayout ? listNode : view === 'create' ? (
        <UserForm onSave={handleCreate} onCancel={() => handleBackToList()} {...formProps} />
      ) : view === 'details' && detailsNode ? (
        detailsNode
      ) : (
        listNode
      )}

      {isOverlayLayout && (
        <>
          <Overlay
            layout={formLayout}
            open={view === 'create'}
            onClose={() => handleBackToList()}
            width={600}
            title={formLayout === 'modal' ? 'Create User' : undefined}
          >
            {view === 'create' && (
              <UserForm onSave={handleCreate} onCancel={() => handleBackToList()} {...formProps} />
            )}
          </Overlay>

          <Overlay
            layout={formLayout}
            open={view === 'details' && selectedUser !== null}
            onClose={() => handleBackToList()}
            width={720}
            title={formLayout === 'modal' && selectedUser ? `Details: ${selectedUser.email}` : undefined}
          >
            {detailsNode}
          </Overlay>
        </>
      )}

      <ConfirmationDialog
        open={actionConfirm !== null}
        title={actionConfirm?.type === 'activate' ? 'Activate User' : 'Deactivate User'}
        message={actionConfirm?.type === 'activate' ? 'Are you sure you want to activate this user? They will regain access to the platform.' : 'Are you sure you want to deactivate this user? They will no longer be able to log in.'}
        confirmLabel={actionConfirm?.type === 'activate' ? 'Activate' : 'Deactivate'}
        variant={actionConfirm?.type === 'deactivate' ? 'danger' : 'primary'}
        onConfirm={handleConfirmAction}
        onCancel={() => setActionConfirm(null)}
      />
    </>
  );
}
