import { useState, useEffect, useMemo } from 'react';
import { useCrud, Drawer } from '@mawsoftwares/ui-web';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '@mawsoftwares/users';
import type { IUserApiService, RoleOption } from './types';
import { UsersList } from './UsersList';
import { UserForm } from './UserForm';
import { UserDetails } from './UserDetails';

export interface UsersManagerProps {
  api: IUserApiService;
  formLayout?: 'page' | 'drawer';
}

type ViewState = 'list' | 'create' | 'details';

export function UsersManager({ api, formLayout = 'page' }: UsersManagerProps) {
  const [view, setView] = useState<ViewState>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsUser, setDetailsUser] = useState<UserResponseDto | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  useEffect(() => {
    if (!api.listRoles) return;
    void api.listRoles()
      .then((items) => setRoles([...items]))
      .catch(() => setRoles([]));
  }, [api]);

  const crudConfig = useMemo(() => ({
    resourceName: 'Users',
    columns: [],
    keyField: 'id',
    fetchList: (params: any) => api.list(params),
    create: (data: any) => api.create(data as CreateUserDto),
    update: (id: string, data: any) => api.update(id, data as UpdateUserDto),
    remove: (id: string) => api.delete(id),
  }), [api]);

  const crud = useCrud<any>(crudConfig);

  const selectedFromList: UserResponseDto | null = selectedId
    ? crud.items.find((u: UserResponseDto) => u.id === selectedId) ?? null
    : null;
  const selectedUser = detailsUser?.id === selectedId ? detailsUser : selectedFromList;

  const formProps = {
    roles,
    uploadAvatar: api.uploadAvatar,
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setView('create');
  };

  const handleViewDetails = (id: string) => {
    const fromList = crud.items.find((u: UserResponseDto) => u.id === id) ?? null;
    setSelectedId(id);
    setDetailsUser(fromList);
    setView('details');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedId(null);
    setDetailsUser(null);
  };

  const handleCreate = async (data: CreateUserDto | UpdateUserDto) => {
    await crud.createItem(data as CreateUserDto);
    handleBackToList();
  };

  const handleUpdate = async (data: UpdateUserDto) => {
    if (!selectedId) return;
    const updated = await crud.updateItem(selectedId, data);
    if (updated) setDetailsUser(updated);
  };

  const handleDelete = async () => {
    if (selectedId) {
      const confirm = window.confirm('Are you sure you want to delete this user?');
      if (confirm) {
        await crud.deleteItem(selectedId);
        handleBackToList();
      }
    }
  };

  const handleActivate = async () => {
    if (!selectedId) return;
    const updated = await api.activate(selectedId);
    setDetailsUser(updated);
    crud.refresh();
  };

  const handleDeactivate = async () => {
    if (!selectedId) return;
    const updated = await api.deactivate(selectedId);
    setDetailsUser(updated);
    crud.refresh();
  };

  const isDrawerLayout = formLayout === 'drawer';
  const detailsNode = selectedUser ? (
    <UserDetails
      user={selectedUser}
      onBack={handleBackToList}
      onDelete={handleDelete}
      onActivate={handleActivate}
      onDeactivate={handleDeactivate}
      onSave={handleUpdate}
      {...formProps}
    />
  ) : null;

  if (!isDrawerLayout) {
    if (view === 'create') {
      return (
        <UserForm
          onSave={handleCreate}
          onCancel={handleBackToList}
          {...formProps}
        />
      );
    }
    if (view === 'details' && detailsNode) {
      return detailsNode;
    }
  }

  return (
    <>
      {(!isDrawerLayout && view !== 'list') ? null : (
        <UsersList
          crud={crud}
          onCreate={handleCreateNew}
          onView={handleViewDetails}
        />
      )}

      {isDrawerLayout && (
        <>
          <Drawer
            open={view === 'create'}
            onClose={handleBackToList}
            width={600}
          >
            {view === 'create' && (
              <UserForm
                onSave={handleCreate}
                onCancel={handleBackToList}
                {...formProps}
              />
            )}
          </Drawer>

          <Drawer
            open={view === 'details' && selectedUser !== null}
            onClose={handleBackToList}
            width={720}
          >
            {detailsNode}
          </Drawer>
        </>
      )}
    </>
  );
}
