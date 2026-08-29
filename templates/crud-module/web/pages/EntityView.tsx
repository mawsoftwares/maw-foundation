import type { ReactNode } from 'react';
import { useState } from 'react';
import { ListPage, DataTable, Button, useToast } from '@mawsoftwares/ui-web';
import { useDynamicAccess } from '@mawsoftwares/ui-web';
import type { EntityResponseDto } from '../../server/application/dto';
import { EntityForm } from '../components/EntityForm';

/**
 * CRUD Module Template — List Page View
 *
 * REPLACE: `Entity` / `entity` / `entities` → your domain noun.
 * WIRE: Replace `useEntitiesApi()` with your actual API hook or service.
 */

// ── Replace this with your actual API integration ──────────────────────────
function useEntitiesApi() {
  // TODO: replace with real API call using @mawsoftwares/api-client
  return {
    items: [] as EntityResponseDto[],
    total: 0,
    isLoading: false,
    refetch: () => { /* fetch from /api/v1/entities */ },
    deleteEntity: async (_id: string) => { /* DELETE /api/v1/entities/:id */ },
  };
}

export function EntitiesView(): ReactNode {
  const { can } = useDynamicAccess();
  const { addToast } = useToast();

  const canCreate = can('Create_Entities');
  const canUpdate = can('Update_Entities');
  const canDelete = can('Delete_Entities');

  const { items, total, isLoading, refetch, deleteEntity } = useEntitiesApi();

  const [showForm, setShowForm]       = useState(false);
  const [editItem, setEditItem]       = useState<EntityResponseDto | undefined>();

  async function handleDelete(id: string) {
    try {
      await deleteEntity(id);
      addToast({ type: 'success', message: 'Deleted successfully' });
      refetch();
    } catch {
      addToast({ type: 'error', message: 'Failed to delete' });
    }
  }

  const columns = [
    { key: 'name',        header: 'Name',        render: (row: EntityResponseDto) => row.name },
    { key: 'description', header: 'Description', render: (row: EntityResponseDto) => row.description ?? '—' },
    { key: 'status',      header: 'Status',      render: (row: EntityResponseDto) => row.status },
    ...(canUpdate || canDelete ? [{
      key: 'actions',
      header: '',
      width: 120,
      render: (row: EntityResponseDto) => (
        <span style={{ display: 'flex', gap: 4 }}>
          {canUpdate && (
            <Button variant="ghost" size="sm" onClick={() => { setEditItem(row); setShowForm(true); }}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              style={{ color: 'var(--maw-danger)' }}
              onClick={() => void handleDelete(row.id)}
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
        title="Entities"
        createLabel="New Entity"
        onCreate={canCreate ? () => { setEditItem(undefined); setShowForm(true); } : undefined}
      >
        <DataTable
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          emptyMessage="No entities found."
          totalCount={total}
        />
      </ListPage>

      {showForm && (
        <EntityForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </>
  );
}
