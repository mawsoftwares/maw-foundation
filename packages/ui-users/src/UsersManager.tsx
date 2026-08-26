import { useState, useCallback, useEffect, useMemo } from 'react';
import { useCrud } from '@maw/ui-web';
import type { UserResponseDto } from '@maw/users';
import type { IUserApiService } from './types';
import { UsersList } from './UsersList';
import { UserForm } from './UserForm';
import { UserDetails } from './UserDetails';

export interface UsersManagerProps {
  api: IUserApiService;
}

type ViewState = 'list' | 'create' | 'edit' | 'details';

export function UsersManager({ api }: UsersManagerProps) {
  const [view, setView] = useState<ViewState>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
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

  // Handle detailed view refresh if needed, but since we have it in list we can use that for now
  // For production, we'd fetch the specific user if it's not in the list.

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

  if (view === 'create' || view === 'edit') {
    return (
      <UserForm
        initialData={view === 'edit' ? selectedUser : null}
        onSave={handleSave}
        onCancel={view === 'edit' ? () => setView('details') : handleBackToList}
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

  return (
    <UsersList
      crud={crud}
      onCreate={handleCreateNew}
      onView={handleViewDetails}
    />
  );
}
