import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Accordion,
  Panel,
  Section,
  Grid,
  Spacer,
  Stack,
  type ColumnDef,
  useToast,
} from '@mawsoftwares/ui-web';

const DEMO_TABLE_DATA = [
  { id: '1', name: 'Alice Johnson', role: 'Admin', status: 'active' },
  { id: '2', name: 'Bob Smith', role: 'Manager', status: 'active' },
  { id: '3', name: 'Charlie Brown', role: 'Clerk', status: 'inactive' },
  { id: '4', name: 'Diana Prince', role: 'Manager', status: 'active' },
];

const DEMO_COLUMNS: ColumnDef<(typeof DEMO_TABLE_DATA)[0]>[] = [
  { key: 'id', header: '#', width: 40 },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'role', header: 'Role', sortable: true },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge>,
  },
];

export function LayoutDataTab(): ReactNode {
  const toast = useToast();

  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>DataTable</h3>
        <DataTable
          columns={DEMO_COLUMNS}
          data={DEMO_TABLE_DATA}
          keyField="id"
          selectable
          selectedKeys={new Set()}
          onSelectionChange={() => {}}
          onRowClick={(row) => toast.info(`Clicked: ${row.name}`)}
          stickyHeader
          pagination={{ page: 1, pageSize: 10, total: 4 }}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Accordion</h3>
        <Accordion
          items={[
            { key: 'billing', title: 'Billing Information', content: <p style={{ margin: 0 }}>Manage your billing details and payment methods.</p> },
            { key: 'shipping', title: 'Shipping Address', content: <p style={{ margin: 0 }}>Update your default shipping address.</p> },
            { key: 'notifications', title: 'Notification Preferences', content: <p style={{ margin: 0 }}>Choose which notifications you want to receive.</p> },
            { key: 'disabled', title: 'Locked Section', content: <p style={{ margin: 0 }}>This section is disabled.</p>, disabled: true },
          ]}
          multiple
          defaultExpanded={['billing']}
        />
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Panel</h3>
        <Stack direction="column" gap="var(--maw-space-md)">
          <Panel title="Default Panel" actions={<Button variant="ghost">Edit</Button>}>
            <p style={{ margin: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>A bordered panel with header actions.</p>
          </Panel>
          <Panel title="Collapsible Panel" collapsible>
            <p style={{ margin: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Click the arrow to collapse this panel.</p>
          </Panel>
          <Panel title="Elevated Panel" variant="elevated">
            <p style={{ margin: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Elevated variant with shadow, no border.</p>
          </Panel>
        </Stack>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Section</h3>
        <Section title="Team Members" description="Manage who has access to this workspace." actions={<Button>Invite</Button>}>
          <p style={{ margin: 0, color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>Section content goes here — tables, forms, or any child elements.</p>
        </Section>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Grid</h3>
        <Grid columns={3} gap="var(--maw-space-sm)">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} style={{ padding: 'var(--maw-space-md)', background: 'var(--maw-bgSubtle)', borderRadius: 'var(--maw-radius-sm)', textAlign: 'center', color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>
              Cell {n}
            </div>
          ))}
        </Grid>
        <Spacer size="var(--maw-space-sm)" />
        <p style={{ margin: 0, color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-xs)' }}>3-column grid with Spacer between sections</p>
      </Card>
    </Stack>
  );
}
