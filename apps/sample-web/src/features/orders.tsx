import { useState, useCallback, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import type { Order } from '@mawsoftwares/sdk';
import type { ApiSuccessResponse } from '@mawsoftwares/api/response/types';
import {
  ListPage,
  DataTable,
  Badge,
  Button,
  Modal,
  TextField,
  useForm,
  FormField,
  useDynamicAccess,
  useToast,
  ErrorState,
  PageLoader,
  type ColumnDef,
  type SortState,
} from '@mawsoftwares/ui-web';
import { client } from '../api';

const COLUMNS: ColumnDef<Order>[] = [
  { key: 'id', header: 'Order ID', sortable: true, width: 100 },
  { key: 'item', header: 'Item', sortable: true },
  { key: 'qty', header: 'Qty', sortable: true, align: 'right', width: 80 },
  {
    key: 'status',
    header: 'Status',
    width: 120,
    render: (row) => <Badge variant={row.status === 'delivered' ? 'success' : 'info'}>{row.status ?? 'pending'}</Badge>,
  },
];

export function OrdersView(): ReactNode {
  const toast = useToast();
  const { can } = useDynamicAccess();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [sort, setSort] = useState<SortState>();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadOrders = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<ApiSuccessResponse<Order[]>>('/api/v1/orders')
      .then((r) => {
        setOrders(r.data);
        setLoaded(true);
      })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = useCallback(() => {
    client
      .request<string>('/api/v1/orders/export', { headers: { Accept: 'text/csv' } })
      .then((csv) => {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orders-export.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded');
      })
      .catch((e: ApiError) => toast.error(`Export failed: ${e.message}`));
  }, [toast]);

  const createForm = useForm({
    initialValues: { item: '', qty: '1' },
    fields: {
      item: { required: true },
      qty: { required: true, validate: (v) => (Number(v) > 0 ? undefined : 'Must be positive') },
    },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/orders', {
          method: 'POST',
          body: JSON.stringify({ item: values.item, qty: Number(values.qty) }),
        });
        toast.success('Order created');
        setShowCreate(false);
        createForm.reset();
        loadOrders();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  if (!loaded && !loading && !error) {
    return (
      <ListPage title="Orders" createLabel="New Order" onCreate={can('Create_Orders') ? () => setShowCreate(true) : undefined}>
        <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)' }}>
          <Button onClick={loadOrders}>Load Orders from API</Button>
        </div>
      </ListPage>
    );
  }

  if (error) return <ErrorState title="Failed to load orders" message={error} retry={loadOrders} />;
  if (loading && !loaded) return <PageLoader message="Loading orders..." />;

  const filtered = filter
    ? orders.filter((o) => o.item.toLowerCase().includes(filter.toLowerCase()) || o.id.includes(filter))
    : orders;

  const sorted = sort
    ? [...filtered].sort((a, b) => {
        const av = String(a[sort.column as keyof Order] ?? '');
        const bv = String(b[sort.column as keyof Order] ?? '');
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sort.direction === 'asc' ? cmp : -cmp;
      })
    : filtered;

  return (
    <>
      <ListPage
        title="Orders"
        description={`${orders.length} total orders`}
        createLabel="New Order"
        onCreate={can('Create_Orders') ? () => setShowCreate(true) : undefined}
        filter={filter}
        onFilterChange={setFilter}
        toolbar={can('Create_Orders') ? <Button variant="ghost" onClick={exportCsv}>Export CSV</Button> : undefined}
      >
        <DataTable
          columns={COLUMNS}
          data={sorted}
          keyField="id"
          sort={sort}
          onSort={setSort}
          loading={loading}
          emptyMessage="No orders found"
          stickyHeader
        />
      </ListPage>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Order" footer={
        <>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={() => createForm.handleSubmit()} disabled={createForm.submitting}>
            {createForm.submitting ? 'Creating...' : 'Create'}
          </Button>
        </>
      }>
        <FormField label="Item Name" error={createForm.getFieldProps('item').error} required>
          <TextField
            value={createForm.values.item}
            onChange={createForm.getFieldProps('item').onChange}
            onBlur={createForm.getFieldProps('item').onBlur}
            placeholder="e.g. Widget C"
          />
        </FormField>
        <FormField label="Quantity" error={createForm.getFieldProps('qty').error} required>
          <TextField
            type="number"
            value={createForm.values.qty}
            onChange={createForm.getFieldProps('qty').onChange}
            onBlur={createForm.getFieldProps('qty').onBlur}
          />
        </FormField>
      </Modal>
    </>
  );
}
