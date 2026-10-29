import { StrictMode, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Web from '@mawsoftwares/ui-web';
import * as Tw from '../src';
import { setUIKit } from '@mawsoftwares/ui-contract';
import { defaultLayoutRegistry, resolveLayout } from '@mawsoftwares/layout';
import { createPageTemplateRegistry, resolvePageTemplate } from '@mawsoftwares/page-templates';
import { createMemoryProjectUiStore } from '@mawsoftwares/layout';
import { createThemeRegistry, starterThemes } from '@mawsoftwares/theme';
import './styles.css';

const { ThemeProvider, useColorMode } = Web;

const ORDERS = Array.from({ length: 23 }, (_, i) => ({
  id: `ORD-${1000 + i}`,
  customer: ['Acme Inc.', 'Globex', 'Initech', 'Umbrella', 'Hooli'][i % 5]!,
  total: 120 + ((i * 37) % 900),
  status: ['Paid', 'Pending', 'Overdue'][i % 3]!,
}));

function TableDemo({ kit }: { kit: typeof Web | typeof Tw }): ReactNode {
  const { DataTable, Badge, Button } = kit;
  const t = Web.useDataTable({ data: ORDERS, keyField: 'id', defaultPageSize: 5, defaultSort: { column: 'id', direction: 'asc' } });
  const [loading, setLoading] = useState(false);
  return (
    <div style={{ marginTop: 12 }}>
      <DataTable
        columns={[
          { key: 'id', header: 'Order', sortable: true },
          { key: 'customer', header: 'Customer', sortable: true },
          { key: 'total', header: 'Total', sortable: true, align: 'right', render: (r: (typeof ORDERS)[number]) => `$${r.total}` },
          {
            key: 'status',
            header: 'Status',
            render: (r: (typeof ORDERS)[number]) => (
              <Badge variant={r.status === 'Paid' ? 'success' : r.status === 'Pending' ? 'warning' : 'danger'}>{r.status}</Badge>
            ),
          },
        ]}
        data={t.displayData}
        keyField="id"
        sort={t.sort}
        onSort={t.onSort}
        pagination={t.pagination}
        onPageChange={t.onPageChange}
        onPageSizeChange={t.onPageSizeChange}
        pageSizeOptions={[5, 10]}
        selectable
        selectedKeys={t.selectedKeys}
        onSelectionChange={t.onSelectionChange}
        rowActions={(r: (typeof ORDERS)[number]) => <Button variant="ghost" onClick={() => alert(r.id)}>View</Button>}
        loading={loading}
      />
      <div style={{ marginTop: 8 }}>
        <Button variant="outline" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1200); }}>Reload</Button>
      </div>
    </div>
  );
}

function Showcase({ kit, title }: { kit: typeof Web | typeof Tw; title: string }): ReactNode {
  const { Button, Card, Badge, TextField, Modal, Select, Tabs, ConfirmationDialog, Stack, Spinner, Icon, TextArea, Toggle, Drawer, DatePicker, DateRangePicker, TimePicker, MultiSelect, SearchableSelect, RadioGroup, Progress, Avatar, Alert, Banner, Wizard, Panel, Section, Grid, Accordion, Popover, DropdownMenu, Tooltip, Dialog, Overlay, Divider, Spacer, Skeleton, SearchBar, ErrorState, EmptyState, PageLoader, LoadingOverlay, SettingsLayout, BreadcrumbTrail } = kit;
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview');
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [date, setDate] = useState('2026-10-22');
  const [on, setOn] = useState(true);
  const [range, setRange] = useState({ start: '', end: '' });
  const [time, setTime] = useState('09:30');
  const [busy, setBusy] = useState(false);
  const [crumbLog, setCrumbLog] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState<string[]>([]);
  const [retries, setRetries] = useState(0);
  const [dlg, setDlg] = useState(false);
  const [dlgLocked, setDlgLocked] = useState(false);
  const [ovl, setOvl] = useState<'drawer' | 'modal' | null>(null);
  const [popOpen, setPopOpen] = useState(false);
  const popAnchor = useRef<HTMLButtonElement>(null);
  const [picked, setPicked] = useState('');
  const [plan, setPlan] = useState('pro');
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [tags, setTags] = useState<readonly string[]>(['design']);
  const [owner, setOwner] = useState('');
  const [city, setCity] = useState('');
  return (
    <section style={{ flex: '1 1 380px', minWidth: 0 }}>
      <h2 style={{ fontFamily: 'var(--maw-font-family)', color: 'var(--maw-fg)', margin: '0 0 12px', fontSize: 18 }}>{title}</h2>
      <Card variant="bordered">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            Save
          </Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <Badge>Default</Badge>
          <Badge variant="success">Paid</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="danger">Overdue</Badge>
          <Badge variant="info">New</Badge>
        </div>
        <Tabs
          tabs={[{ key: 'overview', label: 'Overview' }, { key: 'orders', label: 'Orders' }, { key: 'billing', label: 'Billing' }]}
          activeTab={tab}
          onChange={setTab}
          style={{ marginBottom: 16 }}
        />
        <Select
          label="Status"
          placeholder="Choose status"
          options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]}
        />
        <div style={{ marginBottom: 16 }}>
          <Button variant="outline" onClick={() => setOpen(true)}>Open modal</Button>
        </div>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={12} align="center" style={{ marginBottom: 16 }}>
          <Button variant="danger" onClick={() => setConfirm(true)}>Delete order…</Button>
          <Spinner size={20} />
          <span data-testid="icons" style={{ display: 'inline-flex', gap: 10, color: 'var(--maw-fgMuted)' }}>
            <Icon name="orders" /><Icon name="billing" /><Icon name="rbac" /><Icon name="settings" /><Icon name="nope-🙂" />
          </span>
        </Stack>
        <ConfirmationDialog
          open={confirm}
          variant="danger"
          title="Delete order?"
          message="This cannot be undone."
          confirmLabel="Delete"
          onCancel={() => setConfirm(false)}
          onConfirm={() => setConfirm(false)}
        />
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Create order"
          footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => setOpen(false)}>Save</Button></>}
        >
          <TextField label="Customer" placeholder="Acme Inc." />
        </Modal>
        <div data-testid="wayfinding" style={{ marginBottom: 16 }}>
          <div data-testid="trail">
            <BreadcrumbTrail
              items={[{ label: 'Home', path: '/dashboard' }, { label: 'Super Admin' }, { label: 'Users', path: '/users' }, { label: 'Asha Patil' }]}
              onNavigate={(path) => setCrumbLog((l) => [...l, path])}
            />
          </div>
          <div data-testid="crumb-log" style={{ fontSize: 12 }}>{JSON.stringify(crumbLog)}</div>
          <div data-testid="settings">
            <SettingsLayout
              groups={[
                { key: 'p', title: 'Profile', description: 'Your name and contact details.', children: <TextField label="Name" defaultValue="Poonam" /> },
                { key: 's', title: 'Security', children: <Toggle label="Two-factor" checked onChange={() => undefined} /> },
                { key: 'b', title: 'Billing', description: 'Invoices and plan.', children: <Select options={[{ value: 'pro', label: 'Pro' }]} defaultValue="pro" /> },
              ]}
            />
          </div>
          <Button variant="outline" onClick={() => setBusy(!busy)} data-testid="busy-toggle">Toggle loading</Button>
          <div data-testid="loading" style={{ marginTop: 8 }}>
            <LoadingOverlay loading={busy} label="Saving…"><Card><button data-testid="under-overlay" type="button">Under the overlay</button></Card></LoadingOverlay>
          </div>
        </div>
        <div data-testid="states" style={{ marginBottom: 16 }}>
          <SearchBar value={q} onChange={setQ} onSearch={(t) => setSearched((l) => [...l, t])} placeholder="Search orders" debounceMs={250} loading={q === 'busy'} />
          <div data-testid="search-log" style={{ fontSize: 12, margin: '4px 0 8px' }}>{JSON.stringify(searched)}</div>
          <div data-testid="err"><ErrorState title="Failed to load" message="Network error" retry={() => setRetries((n) => n + 1)} /></div>
          <div data-testid="retries" style={{ fontSize: 12 }}>retries:{retries}</div>
          <div data-testid="empty-emoji"><EmptyState message="Nothing matches" action={<Button variant="outline">Create one</Button>} /></div>
          <div data-testid="empty-icon"><EmptyState icon="users" title="No users" /></div>
          <div data-testid="loader" style={{ maxHeight: 110, overflow: 'hidden' }}><PageLoader message="Loading bills..." /></div>
        </div>
        <div data-testid="sep" style={{ marginBottom: 16 }}>
          <div data-testid="above">Above the divider</div>
          <Divider />
          <div data-testid="below">Below the divider</div>
          <Divider style={{ margin: 0 }} />
          <div data-testid="tight">Tight divider above</div>
          <Spacer size="24px" />
          <div data-testid="after-spacer">After a 24px spacer</div>
          <div data-testid="hrow" style={{ display: 'flex', alignItems: 'center', height: 24 }}>
            <span data-testid="h-a">A</span><Spacer axis="horizontal" size="40px" /><span data-testid="h-b">B</span>
          </div>
          <div data-testid="skels" style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="100%" height={14} />
            <Skeleton width={120} height={32} borderRadius="var(--maw-radius-md)" />
          </div>
        </div>
        <div data-testid="floating" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <button ref={popAnchor} type="button" onClick={() => setPopOpen(!popOpen)} data-testid="pop-anchor" style={{ padding: '8px 12px' }}>Toggle popover</button>
          <Popover open={popOpen} onClose={() => setPopOpen(false)} anchorRef={popAnchor} placement="bottom" align="start">
            <div data-testid="pop-body">Popover content anchored to the button.</div>
          </Popover>
          <DropdownMenu
            trigger={<Button variant="outline">Actions</Button>}
            items={[
              { key: 'edit', label: 'Edit', onClick: () => setPicked('edit') },
              { key: 'dup', label: 'Duplicate', onClick: () => setPicked('duplicate') },
              { key: 'lock', label: 'Archive', disabled: true, disabledReason: 'Archived items are read-only', onClick: () => setPicked('archive') },
              { key: 'del', label: 'Delete', danger: true, onClick: () => setPicked('delete') },
            ]}
          />
          <Tooltip content="Save your changes"><Button>Save</Button></Tooltip>
          <Tooltip content="Only owners can delete"><Button variant="danger" disabled>Delete</Button></Tooltip>
          <span data-testid="picked">{picked}</span>
          <Button variant="outline" onClick={() => setDlg(true)}>Open dialog</Button>
          <Button variant="outline" onClick={() => setDlgLocked(true)}>Locked dialog</Button>
          <Button variant="outline" onClick={() => setOvl('drawer')}>Overlay: drawer</Button>
          <Button variant="outline" onClick={() => setOvl('modal')}>Overlay: modal</Button>
          <Dialog open={dlg} onClose={() => setDlg(false)} title="Dialog title" footer={<Button onClick={() => setDlg(false)}>Done</Button>}>
            <p data-testid="dlg-body">Dialog body</p>
          </Dialog>
          <Dialog open={dlgLocked} onClose={() => setDlgLocked(false)} closeOnOverlay={false} title="Locked" footer={<Button onClick={() => setDlgLocked(false)}>Close me</Button>}>
            <p data-testid="locked-body">Backdrop clicks do not close this one.</p>
          </Dialog>
          <Overlay open={ovl !== null} layout={ovl ?? 'drawer'} onClose={() => setOvl(null)} title={`Overlay ${ovl ?? ''}`}>
            <p data-testid="ovl-body">Overlay body</p>
          </Overlay>
        </div>
        <div data-testid="layout" style={{ marginBottom: 16 }}>
          <Section title="Overview" description="Layout primitives" actions={<Button variant="outline">Edit</Button>}>
            <Grid columns={{ xs: 1, md: 3 }} gap={12}>
              <Panel title="Static" actions={<Badge>new</Badge>}><div data-testid="p-static">Always visible</div></Panel>
              <Panel title="Collapsible" collapsible variant="elevated"><div data-testid="p-body">Body text</div></Panel>
              <Panel title="Collapsed" collapsible defaultCollapsed variant="outlined"><div data-testid="p-hidden">Hidden body</div></Panel>
            </Grid>
            <div style={{ height: 8 }} />
            <Grid minChildWidth={90} gap="8px"><Card>A</Card><Card>B</Card><Card>C</Card><Card>D</Card></Grid>
            <div style={{ height: 8 }} />
            <Accordion
              defaultExpanded={['one']}
              items={[
                { key: 'one', title: 'First', content: 'First content' },
                { key: 'two', title: 'Second', content: 'Second content' },
                { key: 'three', title: 'Disabled', content: 'Never', disabled: true },
              ]}
            />
            <div style={{ height: 8 }} />
            <Accordion multiple defaultExpanded={['a', 'b']} items={[{ key: 'a', title: 'Multi A', content: 'A body' }, { key: 'b', title: 'Multi B', content: 'B body' }]} />
          </Section>
        </div>
        <div data-testid="misc" style={{ marginBottom: 16 }}>
          <RadioGroup
            label="Plan"
            name={`plan-${kit === Tw ? 'tw' : 'web'}`}
            value={plan}
            onChange={setPlan}
            direction="row"
            options={[{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }, { value: 'team', label: 'Team', disabled: true }]}
          />
          <Progress value={64} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
            <Avatar name="Poonam Dhomane" />
            <Avatar name="Asha" size={32} />
            <Avatar src="https://invalid.example/missing.png" name="Broken Image" size={32} />
            <Avatar />
          </div>
          {!dismissed && <Alert variant="warning" title="Heads up" onDismiss={() => setDismissed(true)}>Your trial ends in 3 days.</Alert>}
          <div style={{ display: 'grid', gap: 8, margin: '8px 0' }}>
            <Alert variant="success">Saved.</Alert>
            <Alert variant="danger" title="Failed">Could not reach server.</Alert>
            <Banner variant="info" action={<Button variant="ghost">Details</Button>} onDismiss={() => undefined}>Scheduled maintenance tonight.</Banner>
          </div>
          <Wizard
            activeStep={step}
            onStepChange={setStep}
            onComplete={() => setStep(0)}
            steps={[
              { key: 'a', title: 'Account', content: <div>Step one content</div> },
              { key: 'b', title: 'Billing', content: <div>Step two content</div>, isValid: plan !== 'free' },
              { key: 'c', title: 'Review', content: <div>All set</div> },
            ]}
          />
        </div>
        <div data-testid="inputs">
          <DatePicker label="Due date" value={date} onChange={setDate} min="2026-10-10" max="2026-11-20" />
          <DateRangePicker label="Period" value={range} onChange={setRange} min="2026-10-05" />
          <TimePicker label="Start time" value={time} onChange={setTime} step={15} />
          <MultiSelect
            label="Tags"
            value={tags}
            onChange={setTags}
            maxSelections={3}
            options={[{ value: 'design', label: 'Design' }, { value: 'dev', label: 'Development' }, { value: 'ops', label: 'Operations' }, { value: 'sales', label: 'Sales' }, { value: 'legal', label: 'Legal', disabled: true }]}
          />
          <SearchableSelect label="Owner" value={owner} onChange={setOwner} options={[{ value: 'a', label: 'Asha Patil' }, { value: 'b', label: 'Bharat Rao' }, { value: 'c', label: 'Chitra Nair' }]} />
          <SearchableSelect
            label="City (async)"
            value={city}
            onChange={setCity}
            debounceMs={150}
            loadOptions={(q) =>
              new Promise((resolve) =>
                setTimeout(
                  () => resolve(['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Delhi'].filter((c) => c.toLowerCase().includes(q.toLowerCase())).map((c) => ({ value: c.toLowerCase(), label: c }))),
                  200,
                ),
              )
            }
          />
          <TextArea label="Notes" placeholder="Anything we should know?" rows={2} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <Toggle label="Notify" checked={on} onChange={setOn} />
            <Button variant="outline" onClick={() => setDrawer(true)}>Open drawer</Button>
          </div>
        </div>
        <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filters" footer={<Button onClick={() => setDrawer(false)}>Apply</Button>}>
          <TextField label="Customer" placeholder="Acme Inc." />
        </Drawer>
        <TextField label="Email" placeholder="you@company.com" helperText="We never share your email." />
        <TextField label="Name" required defaultValue="Poonam" />
        <TextField label="Password" type="password" error="Password must be at least 8 characters" defaultValue="abc" />
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 12 }}>
        <Card variant="default"><b>Default</b><br />soft shadow</Card>
        <Card variant="elevated"><b>Elevated</b><br />deep shadow</Card>
        <Card variant="interactive"><b>Interactive</b><br />hover me</Card>
      </div>
      <TableDemo kit={kit} />
    </section>
  );
}

/** ui-web's OWN composites (ListPage, DataTable). Their internal Button/TextField/Checkbox follow the installed kit. */
function CompositeDemo(): ReactNode {
  const [filter, setFilter] = useState('');
  const t = Web.useDataTable({ data: ORDERS, keyField: 'id', defaultPageSize: 5 });
  return (
    <>
    <Web.NavigationProvider config={{ items: [], activeKey: '', onNavigate: () => undefined, breadcrumbs: [{ label: 'Home', path: '/dashboard' }, { label: 'Orders' }] }}>
      <div data-testid="composite-crumbs"><Web.Breadcrumbs /></div>
    </Web.NavigationProvider>
    <Web.ListPage
      title="Orders"
      description="Rendered by ui-web's ListPage + DataTable"
      createLabel="New order"
      onCreate={() => undefined}
      filter={filter}
      onFilterChange={(f) => { setFilter(f); t.setFilter(f); }}
    >
      <Web.DataTable
        columns={[{ key: 'id', header: 'Order', sortable: true }, { key: 'customer', header: 'Customer', sortable: true }, { key: 'status', header: 'Status' }]}
        data={t.displayData}
        keyField="id"
        sort={t.sort}
        onSort={t.onSort}
        pagination={t.pagination}
        onPageChange={t.onPageChange}
        onPageSizeChange={t.onPageSizeChange}
        pageSizeOptions={[5, 10]}
        selectable
        selectedKeys={t.selectedKeys}
        onSelectionChange={t.onSelectionChange}
      />
    </Web.ListPage>
    </>
  );
}


const NAV_ITEMS = [
  { key: 'dash', label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  {
    key: 'sales',
    label: 'Sales',
    path: '/sales',
    icon: 'orders',
    group: 'Business',
    children: [
      { key: 'orders', label: 'Orders', path: '/orders' },
      { key: 'invoices', label: 'Invoices', path: '/invoices', badge: 3 },
    ],
  },
  { key: 'users', label: 'Users', path: '/users', icon: 'rbac', group: 'Admin' },
];
const flatNav = NAV_ITEMS.flatMap((i) => [i, ...(i.children ?? [])]);

const demoPages = createPageTemplateRegistry({ widgets: ['revenue', 'orders-chart', 'activity'] });
const demoWidgets: Web.WidgetRegistry = {
  revenue: { title: 'Revenue', render: () => <Web.KpiCard label="Revenue" value="$12,400" change={12.5} changeLabel="vs last month" icon="billing" /> },
  'orders-chart': { title: 'Orders (12 months)', height: 160, render: () => 'Chart area' },
  activity: { title: 'Activity', render: () => 'Feed' },
};
const demoPageConfigs: Record<string, unknown> = {
  dashboard: {
    version: 1,
    templateId: 'dashboard',
    settings: { columns: 3, aside: true },
    widgets: [
      { slot: 'kpis', widget: 'revenue' },
      { slot: 'kpis', widget: 'revenue', title: 'Revenue 2' },
      { slot: 'kpis', widget: 'revenue', title: 'Revenue 3' },
      { slot: 'widgets', widget: 'orders-chart', span: 2 },
      { slot: 'widgets', widget: 'activity' },
      { slot: 'aside', widget: 'activity', title: 'Recent' },
    ],
  },
  listing: { version: 1, templateId: 'listing' },
  details: { version: 1, templateId: 'details' },
  form: { version: 1, templateId: 'form' },
  kanban: { version: 1, templateId: 'kanban' },
  calendar: { version: 1, templateId: 'calendar' },
  communication: { version: 1, templateId: 'communication' },
};
const box = (label: string, h = 120): ReactNode => (
  <div style={{ height: h, border: '1px dashed var(--maw-border)', borderRadius: 8, padding: 12, color: 'var(--maw-fgMuted)', background: 'var(--maw-surface)' }}>{label}</div>
);
const demoSlots = (t: string): Web.PageSlots => ({
  header: <h2 style={{ margin: 0, color: 'var(--maw-fg)' }}>{t} page</h2>,
  summary: box('Summary', 60),
  filters: box('Filters', 48),
  toolbar: box('Toolbar', 48),
  content: box('Main content', 200),
  aside: box('Side column', 160),
  footer: box('Form actions', 48),
  board: (
    <div style={{ display: 'flex', gap: 12 }}>
      {['Draft', 'In progress', 'Done', 'Archived'].map((c) => <div key={c} style={{ width: 280, flexShrink: 0 }}>{box(c, 220)}</div>)}
    </div>
  ),
  calendar: box('Calendar surface', 280),
  list: box('Conversations', 360),
  thread: box('Thread', 360),
  details: box('Details', 360),
});

/** The real ui-web shell composites (NavigationProvider, AppShell, Sidebar, Breadcrumbs, KpiGrid) under a runtime kit switch. */
function ShellDemo(): ReactNode {
  const [useTw, setUseTw] = useState(() => new URLSearchParams(location.search).get('kit') === 'tailwind');
  const [active, setActive] = useState('dash');
  const [pageId, setPageId] = useState(() => new URLSearchParams(location.search).get('page') ?? '');
  const [presetId, setPresetId] = useState(() => new URLSearchParams(location.search).get('layout') ?? '');
  const layout = resolveLayout(presetId === '' ? null : { version: 1, presetId });
  setUIKit(useTw ? Tw.tailwindKit : {});
  const K = useTw ? Tw : Web; // what an app gets from `import { Widget } from '@mawsoftwares/ui-web'` under each build
  const current = flatNav.find((i) => i.key === active)!;
  return (
    <Web.NavigationProvider
      config={{
        items: NAV_ITEMS,
        activeKey: active,
        onNavigate: (path) => setActive(flatNav.find((i) => i.path === path)?.key ?? 'dash'),
        breadcrumbs: [{ label: 'Home', path: '/dashboard' }, { label: current.label }],
      }}
    >
      <Web.AppShell
        layout={layout}
        slots={{
          search: <K.SearchBar value="" onChange={() => undefined} placeholder="Search" />,
          'theme-toggle': <K.Badge>theme</K.Badge>,
          notifications: <K.Badge>3</K.Badge>,
        }}
        rightPanel={<div data-testid="right-panel"><h3 style={{ margin: 0 }}>Activity</h3><p>Panel content supplied by the app.</p></div>}
        rightPanelLabel="Activity"
        sidebar={<Web.Sidebar title="Acme" logo={<span data-testid="logo">◆</span>} footer={(rail) => <span data-testid="sb-footer">{rail ? 'v1' : 'Version 1.0'}</span>} />}
        header={<Web.Breadcrumbs />}
        actions={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <select aria-label="Layout preset" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              <option value="">(none → default)</option>
              {defaultLayoutRegistry.listPresets().map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <select aria-label="Page template" value={pageId} onChange={(e) => setPageId(e.target.value)}>
              <option value="">(classic content)</option>
              {Object.keys(demoPageConfigs).map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
            <K.Checkbox label="Tailwind kit" checked={useTw} onChange={setUseTw} />
          </span>
        }
      >
        {pageId !== '' ? (
          <Web.PageTemplate
            template={resolvePageTemplate(demoPageConfigs[pageId], demoPages)}
            slots={demoSlots(pageId)}
            widgets={demoWidgets}
          />
        ) : (
        <div data-testid="shell-page">
          <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--maw-font-family)', color: 'var(--maw-fg)' }}>{current.label}</h2>
          <Web.KpiGrid
            kpis={[
              { label: 'Revenue', value: '$12,400', change: 12.5, changeLabel: 'vs last month', icon: 'billing' },
              { label: 'Orders', value: 320, change: -3, changeLabel: 'vs last week', icon: 'orders' },
              { label: 'Users', value: 1280, icon: '👥', color: '#16a34a' },
              { label: 'Pending', value: 7 },
            ]}
          />
          <Web.WidgetGrid>
            <K.Widget title="Orders (12 months)" span={2} height={160}>Chart area</K.Widget>
            <K.Widget title="Revenue">Trend</K.Widget>
            <K.Widget title="Activity" span={{ xs: 1, xl: 2 }} actions={<K.Badge>live</K.Badge>}>Feed</K.Widget>
          </Web.WidgetGrid>
        </div>
        )}
      </Web.AppShell>
    </Web.NavigationProvider>
  );
}

function Page(): ReactNode {
  const [tailwindInternals, setTailwindInternals] = useState(false);
  // Install (or clear) the kit before children render — ui-web composites resolve it at render time.
  setUIKit(tailwindInternals ? Tw.tailwindKit : {});
  const { isDark, toggleColorMode } = useColorMode();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--maw-canvas)', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--maw-font-family)', color: 'var(--maw-fg)', fontSize: 22 }}>
          ui-web <span style={{ color: 'var(--maw-fgMuted)' }}>vs</span> ui-web-tailwind
        </h1>
        <Tw.Button variant="outline" onClick={toggleColorMode}>{isDark ? 'Light mode' : 'Dark mode'}</Tw.Button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <Showcase kit={Web} title="@mawsoftwares/ui-web (current)" />
        <Showcase kit={Tw} title="@mawsoftwares/ui-web-tailwind (prototype)" />
      </div>
      <section style={{ marginTop: 32 }}>
        <Tw.Checkbox
          label="setUIKit(tailwindKit) — ui-web composites render Tailwind primitives inside"
          checked={tailwindInternals}
          onChange={setTailwindInternals}
          style={{ marginBottom: 12 }}
        />
        <div data-testid="composite"><CompositeDemo /></div>
      </section>
    </div>
  );
}

const studioStore = createMemoryProjectUiStore({ actor: 'demo' });
const studioThemes = createThemeRegistry(starterThemes);
function StudioDemo(): ReactNode {
  // Same as the real app: `?kit=tailwind` installs the Tailwind kit before anything renders.
  setUIKit(new URLSearchParams(location.search).get('kit') === 'tailwind' ? Tw.tailwindKit : {});
  const can = (p: string): boolean => new URLSearchParams(location.search).get('readonly') === '1' ? p === 'Read_Layout' : true;
  return (
    <div style={{ padding: 24, background: 'var(--maw-canvas)', minHeight: '100vh' }}>
      <Web.LayoutStudio store={studioStore} themes={studioThemes} can={can} onPreview={() => undefined} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultColorMode="light">
      {location.hash === '#shell' ? <ShellDemo /> : location.hash === '#studio' ? <StudioDemo /> : <Page />}
    </ThemeProvider>
  </StrictMode>,
);
