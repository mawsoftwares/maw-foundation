import { useState, type ReactNode } from 'react';
import { ApiError } from '@maw/api-client';
import { ListPage, DataTable, Badge, Button, ErrorState, PageLoader, useToast, type ColumnDef } from '@maw/ui-web';
import { client } from '../api';

interface InventoryItem {
  sku: string;
  name: string;
  stock: number;
}

const COLUMNS: ColumnDef<InventoryItem>[] = [
  { key: 'sku', header: 'SKU', sortable: true, width: 120 },
  { key: 'name', header: 'Name', sortable: true },
  {
    key: 'stock',
    header: 'Stock',
    sortable: true,
    align: 'right',
    width: 100,
    render: (row) => (
      <Badge variant={row.stock < 10 ? 'danger' : row.stock < 50 ? 'warning' : 'success'}>
        {row.stock}
      </Badge>
    ),
  },
];

export function InventoryView(): ReactNode {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();

  const load = () => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ items: InventoryItem[] }>('/inventory')
      .then((r) => { setItems(r.items); setLoaded(true); toast.success('Inventory loaded'); })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  };

  if (error) return <ErrorState title="Failed to load inventory" message={error} retry={load} />;
  if (loading && !loaded) return <PageLoader message="Loading inventory..." />;

  if (!loaded) {
    return (
      <ListPage title="Inventory">
        <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)' }}>
          <Button onClick={load}>Load Inventory</Button>
        </div>
      </ListPage>
    );
  }

  return (
    <ListPage title="Inventory" description={`${items.length} items in stock`}>
      <DataTable columns={COLUMNS} data={items} keyField="sku" stickyHeader />
    </ListPage>
  );
}
