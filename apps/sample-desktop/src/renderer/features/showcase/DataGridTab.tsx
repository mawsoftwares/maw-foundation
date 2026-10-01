import type { ReactNode } from 'react';
import { Badge, Button, Card, Stack, DataGrid, useToast } from '@mawsoftwares/ui-web';
import type { DataGridSchema } from '@mawsoftwares/sdk';

type Product = { id: string; name: string; category: string; price: number; stock: number; status: string };

const DEMO_PRODUCTS: Product[] = [
  { id: '1', name: 'Espresso', category: 'Beverages', price: 350, stock: 100, status: 'active' },
  { id: '2', name: 'Cappuccino', category: 'Beverages', price: 450, stock: 80, status: 'active' },
  { id: '3', name: 'Caesar Salad', category: 'Food', price: 850, stock: 25, status: 'active' },
  { id: '4', name: 'Cheesecake', category: 'Desserts', price: 650, stock: 15, status: 'active' },
  { id: '5', name: 'Latte', category: 'Beverages', price: 400, stock: 60, status: 'active' },
  { id: '6', name: 'Grilled Chicken', category: 'Food', price: 1200, stock: 30, status: 'active' },
  { id: '7', name: 'Tiramisu', category: 'Desserts', price: 700, stock: 0, status: 'inactive' },
  { id: '8', name: 'Americano', category: 'Beverages', price: 300, stock: 90, status: 'active' },
  { id: '9', name: 'Pasta Carbonara', category: 'Food', price: 1100, stock: 20, status: 'active' },
  { id: '10', name: 'Brownie', category: 'Desserts', price: 550, stock: 40, status: 'active' },
  { id: '11', name: 'Green Tea', category: 'Beverages', price: 250, stock: 70, status: 'active' },
  { id: '12', name: 'Fish & Chips', category: 'Food', price: 1350, stock: 10, status: 'inactive' },
];

const PRODUCT_GRID_SCHEMA: DataGridSchema<Product> = {
  keyField: 'id',
  columns: [
    { id: 'id', field: 'id', header: '#', width: 50, sortable: true },
    { id: 'name', field: 'name', header: 'Product Name', sortable: true },
    { id: 'category', field: 'category', header: 'Category', sortable: true },
    {
      id: 'price', field: 'price', header: 'Price', sortable: true, align: 'right',
      formatter: (v: unknown) => `$${(Number(v) / 100).toFixed(2)}`,
    },
    {
      id: 'stock', field: 'stock', header: 'Stock', sortable: true, align: 'right',
      formatter: (v: unknown) => String(v),
    },
    {
      id: 'status', field: 'status', header: 'Status',
      render: (row: Product) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge>,
    },
  ],
  search: { enabled: true, placeholder: 'Search products…', debounceMs: 200 },
  sort: { defaultSort: { field: 'name', direction: 'asc' } },
  pagination: { defaultPageSize: 5, pageSizeOptions: [5, 10, 25] },
  selection: { enabled: true, mode: 'multi' },
  export: { enabled: true, formats: ['csv'], filename: 'products' },
  bulkActions: [
    {
      id: 'delete',
      label: 'Delete',
      variant: 'danger',
      confirm: { title: 'Delete products?', message: 'This cannot be undone.', variant: 'danger', confirmLabel: 'Delete' },
      handler: () => { /* demo */ },
    },
  ],
  rowActions: [
    { id: 'edit', label: 'Edit', handler: () => { /* demo */ } },
    {
      id: 'delete', label: 'Delete', variant: 'danger',
      confirm: { title: 'Delete product?', message: 'This product will be permanently removed.', variant: 'danger' },
      handler: () => { /* demo */ },
    },
  ],
  expansion: {
    enabled: true,
    render: (row: Product) => (
      <div style={{ padding: 'var(--maw-space-sm)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
        <strong>{row.name}</strong> — {row.category} — Stock: {row.stock} units — Price: ${(row.price / 100).toFixed(2)}
      </div>
    ),
  },
  empty: { title: 'No products', message: 'No products match your search criteria.' },
  striped: true,
  hoverable: true,
  stickyHeader: true,
};

export function DataGridTab(): ReactNode {
  const toast = useToast();

  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      <Card>
        <DataGrid
          schema={PRODUCT_GRID_SCHEMA}
          dataSource={{ data: DEMO_PRODUCTS }}
          title="Products"
          description="Schema-driven DataGrid with search, sort, pagination, selection, row expansion, bulk actions, and export."
          headerActions={<Button onClick={() => toast.info('Add product')}>+ Add Product</Button>}
        />
      </Card>
    </Stack>
  );
}
