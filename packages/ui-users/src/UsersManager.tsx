import { useState, useEffect, useMemo } from 'react';
import { useCrud } from '@mawsoftwares/ui-web';
import { Drawer } from '@mawsoftwares/ui-web';
import type { UserResponseDto } from '@mawsoftwares/users';
import type { IUserApiService, RoleOption } from './types';
import { UsersList } from './UsersList';
import { UserForm } from './UserForm';
import { UserDetails } from './UserDetails';

export interface UsersManagerProps {
  api: IUserApiService;
  formLayout?: 'page' | 'drawer';
}

type ViewState = 'list' | 'create' | 'edit' | 'details';

export function UsersManager({ api, formLayout = 'page' }: UsersManagerProps) {
  const [view, setView] = useState<ViewState>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    create: (data: any) => api.create(data as any),
    update: (id: string, data: any) => api.update(id, data as any),
    remove: (id: string) => api.delete(id),
  }), [api]);

  const crud = useCrud<any>(crudConfig);

  const selectedUser = selectedId ? crud.items.find(u => u.id === selectedId) : null;

  const formProps = {
    roles,
    uploadAvatar: api.uploadAvatar,
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setView('create');
  };

  const handleViewDetails = (id: string) => {
    setSelectedId(id);
    setView('details');
  };

  const handleEdit = () => {
    setView('edit');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedId(null);
  };

  const handleSave = async (data: any) => {
    if (view === 'create') {
      await crud.createItem(data);
    } else if (view === 'edit' && selectedId) {
      await crud.updateItem(selectedId, data);
    }
    handleBackToList();
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
    if (selectedId) {
      await api.activate(selectedId);
      crud.refresh();
    }
  };

  const handleDeactivate = async () => {
    if (selectedId) {
      await api.deactivate(selectedId);
      crud.refresh();
    }
  };

  const isFormView = view === 'create' || view === 'edit';
  const isDrawerLayout = formLayout === 'drawer';

  // If we are using page layout, mutually exclude views
  if (!isDrawerLayout) {
    if (isFormView) {
      return (
        <UserForm
          initialData={view === 'edit' ? selectedUser : null}
          onSave={handleSave}
          onCancel={view === 'edit' ? () => setView('details') : handleBackToList}
          {...formProps}
        />
      );
    }
    if (view === 'details' && selectedUser) {
      return (
        <UserDetails
          user={selectedUser}
          onBack={handleBackToList}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
        />
      );
    }
  }

  const isDetailsView = view === 'details';

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
            open={isFormView}
            onClose={view === 'edit' ? () => setView('details') : handleBackToList}
            width={600}
          >
            {isFormView && (
              <UserForm
                initialData={view === 'edit' ? selectedUser : null}
                onSave={handleSave}
                onCancel={view === 'edit' ? () => setView('details') : handleBackToList}
                {...formProps}
              />
            )}
          </Drawer>

          <Drawer
            open={isDetailsView && selectedUser !== null}
            onClose={handleBackToList}
            width={700}
          >
            {isDetailsView && selectedUser && (
              <div style={{ margin: 'calc(-1 * var(--maw-space-xl))' }}>
                <UserDetails
                  user={selectedUser}
                  onBack={handleBackToList}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                />
              </div>
            )}
          </Drawer>
        </>
      )}
    </>
  );
}
