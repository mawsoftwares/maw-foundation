import { useState, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import { ListPage, DataTable, Badge, Button, useDynamicAccess, useToast, ErrorState, PageLoader, type ColumnDef } from '@mawsoftwares/ui-web';
import { client } from '../api';

interface Bill {
  id: string;
  amount: number;
  status: string;
}

const COLUMNS: ColumnDef<Bill>[] = [
  { key: 'id', header: 'Bill ID', sortable: true, width: 100 },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    align: 'right',
    render: (row) => `₹${(row.amount / 100).toLocaleString('en-IN')}`,
  },
  {
    key: 'status',
    header: 'Status',
    width: 120,
    render: (row) => <Badge variant={row.status === 'paid' ? 'success' : 'warning'}>{row.status}</Badge>,
  },
];

export function BillingView(): ReactNode {
  const toast = useToast();
  const { can } = useDynamicAccess();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();

  const load = () => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ bills: Bill[] }>('/billing')
      .then((r) => { setBills(r.bills); setLoaded(true); toast.success('Bills loaded'); })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  };

  const createBill = () => {
    client
      .request('/billing', { method: 'POST', body: JSON.stringify({ amount: 9900, status: 'open' }) })
      .then(() => { toast.success('Bill created'); load(); })
      .catch((e: ApiError) => toast.error(`${e.status}: ${e.message}`));
  };

  if (error) return <ErrorState title="Failed to load billing" message={error} retry={load} />;
  if (loading && !loaded) return <PageLoader message="Loading bills..." />;

  const canCreate = can('Create_Billing');

  if (!loaded) {
    return (
      <ListPage title="Billing" createLabel="New Bill" onCreate={canCreate ? createBill : undefined}>
        <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)' }}>
          <Button onClick={load}>Load Bills</Button>
        </div>
      </ListPage>
    );
  }

  return (
    <ListPage title="Billing" description={`${bills.length} bills`} createLabel="New Bill" onCreate={canCreate ? createBill : undefined}>
      <DataTable columns={COLUMNS} data={bills} keyField="id" stickyHeader />
    </ListPage>
  );
}
