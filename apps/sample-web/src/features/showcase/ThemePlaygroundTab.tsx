import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert, Badge, Breadcrumbs, Button, Card, Checkbox, DataTable, DropdownMenu, KpiCard, Modal,
  NavigationProvider, RadioGroup, Select, Sidebar, Stack, Tabs, TextArea, TextField, ThemeProbes, Toggle, useTheme,
  type ButtonVariant, type CardVariant,
} from '@mawsoftwares/ui-web';
import {
  applyAccessibilityFixes, designToTheme, validateTheme,
  type AccessibilityOverride, type DesignToThemeResult, type Measurements, type ThemeOverrides,
} from '@mawsoftwares/theme';
import { themeRegistry } from '../../themes';
import { ReferenceCompare } from './ReferenceCompare';
import { ThemeExportPanel } from './ThemeExportPanel';
import { ThemeValidationPanel } from './ThemeValidationPanel';

const BUTTON_VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'];
const CARD_VARIANTS: readonly CardVariant[] = ['default', 'elevated', 'bordered', 'interactive'];

interface Row { id: string; name: string; role: string; status: string }
const ROWS: readonly Row[] = [
  { id: '1', name: 'Alice Johnson', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Bob Smith', role: 'Editor', status: 'Pending' },
  { id: '3', name: 'Charlie Day', role: 'Viewer', status: 'Suspended' },
];
const STATUS_VARIANT = { Active: 'success', Pending: 'warning', Suspended: 'danger' } as const;

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section style={{ marginBottom: 'var(--maw-space-xl)' }}>
      <h3 style={{ margin: '0 0 var(--maw-space-md)', color: 'var(--maw-fg)', fontSize: 'var(--maw-text-md)' }}>{title}</h3>
      {children}
    </section>
  );
}

const NAV_ITEMS = [
  { key: 'home', label: 'Dashboard', icon: 'home', path: '/' },
  { key: 'users', label: 'Users', icon: 'users', path: '/users' },
  { key: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
];

/**
 * Renders every themed component family in each state, so a generated theme can be checked against the
 * reference design side by side. Paste a design.md to try it live (not saved — use Theme Designer to apply).
 */
export function ThemePlaygroundTab(): ReactNode {
  const { applyThemeOverrides } = useTheme();
  const [designMd, setDesignMd] = useState('');
  const [result, setResult] = useState<DesignToThemeResult | null>(null);
  const [overrides, setOverrides] = useState<ThemeOverrides>({});
  const [error, setError] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [accepted, setAccepted] = useState<readonly AccessibilityOverride[]>([]);
  const [tab, setTab] = useState('one');
  const [check, setCheck] = useState(true);
  const [on, setOn] = useState(true);
  const [radio, setRadio] = useState('a');
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);

  const report = useMemo(
    () => validateTheme({ overrides, design: result?.design, measurements, accessibilityOverrides: accepted }),
    [overrides, result, measurements, accepted],
  );

  const tryDesign = async (): Promise<void> => {
    try {
      const next = await designToTheme({ kind: 'design-md', content: designMd, name: 'pasted design' });
      setResult(next);
      setOverrides(next.overrides);
      setAccepted([]);
      setError(null);
      applyThemeOverrides(next.overrides);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the design');
    }
  };

  const [clientId, setClientId] = useState('');
  const switchClient = (id: string): void => {
    setClientId(id);
    if (id === '') return;
    // A registered client theme replaces whatever was previewed; validation then runs on its provenance.
    const next = themeRegistry.resolveOverrides(id);
    setResult(null);
    setOverrides(next);
    setAccepted([]);
    applyThemeOverrides(next);
  };

  const applyFix = (findingId: string): void => {
    const fixed = applyAccessibilityFixes(overrides, report, [findingId]);
    setOverrides(fixed);
    applyThemeOverrides(fixed);
  };

  return (
    <div>
      <ThemeProbes onMeasure={setMeasurements} />
      <Section title="Try a design (live preview, not saved)">
        <TextArea
          value={designMd}
          onChange={(e) => setDesignMd(e.target.value)}
          placeholder="Paste a design.md here…"
          rows={5}
        />
        <Stack direction="row" gap="var(--maw-space-sm)" style={{ marginTop: 'var(--maw-space-sm)' }}>
          <Button onClick={() => { void tryDesign(); }} disabled={designMd.trim() === ''}>Apply to preview</Button>
        </Stack>
        {error !== null && <Alert variant="danger" title="Could not read the design">{error}</Alert>}
        {result !== null && result.warnings.length > 0 && (
          <Alert variant="warning" title="Import warnings">{result.warnings.join(' · ')}</Alert>
        )}
      </Section>

      <Section title="Client theme (runtime switch)">
        <Select
          label="Registered client themes"
          value={clientId}
          onChange={(e) => switchClient(e.target.value)}
          placeholder="Choose a client theme…"
          options={themeRegistry.ids().map((id) => ({ value: id, label: id }))}
          helperText="Same components and pages; only the theme changes. Generate more with `pnpm theme:generate`."
        />
      </Section>

      <Section title="Validation">
        <ThemeValidationPanel
          report={report}
          result={result}
          onAccept={(findingId, reason) => setAccepted((prev) => [...prev.filter((a) => a.findingId !== findingId), { findingId, reason }])}
          onUndoAccept={(findingId) => setAccepted((prev) => prev.filter((a) => a.findingId !== findingId))}
          onApplyFix={applyFix}
        />
      </Section>

      <Section title="Export">
        <ThemeExportPanel overrides={overrides} {...(result?.design.meta.name === undefined ? {} : { name: result.design.meta.name })} />
      </Section>

      <Section title="Reference vs generated">
      <ReferenceCompare>
      <Section title="Buttons — variants, disabled, loading">
        <Stack direction="row" gap="var(--maw-space-sm)" style={{ flexWrap: 'wrap' }}>
          {BUTTON_VARIANTS.map((v) => <Button key={v} variant={v}>{v}</Button>)}
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </Stack>
      </Section>

      <Section title="Inputs — default, filled, error, disabled, readonly">
        <div style={{ display: 'grid', gap: 'var(--maw-space-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <TextField label="Default" placeholder="Type here" />
          <TextField label="Filled" defaultValue="Ada Lovelace" />
          <TextField label="Error" defaultValue="not-an-email" error="Enter a valid email" required />
          <TextField label="Disabled" defaultValue="Locked" disabled />
          <TextField label="Read only" defaultValue="Read only" readOnly helperText="Helper text" />
          <Select label="Select" options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]} />
        </div>
      </Section>

      <Section title="Form controls">
        <Stack direction="row" gap="var(--maw-space-xl)" style={{ flexWrap: 'wrap' }}>
          <Checkbox label="Checkbox" checked={check} onChange={setCheck} />
          <Checkbox label="Disabled" checked={false} onChange={() => undefined} disabled />
          <Toggle label="Switch" checked={on} onChange={setOn} />
          <RadioGroup
            name="pg-radio" label="Radio" value={radio} onChange={setRadio} direction="row"
            options={[{ value: 'a', label: 'One' }, { value: 'b', label: 'Two' }]}
          />
        </Stack>
      </Section>

      <Section title="Cards">
        <div style={{ display: 'grid', gap: 'var(--maw-space-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {CARD_VARIANTS.map((v) => <Card key={v} variant={v}><strong>{v}</strong><div>Card body</div></Card>)}
        </div>
      </Section>

      <Section title="Table — header, rows, hover, selected, pagination">
        <DataTable<Row>
          keyField="id"
          data={ROWS}
          selectable
          selectedKeys={new Set(['2'])}
          pagination={{ page, pageSize: 10, total: 42 }}
          onPageChange={setPage}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'role', header: 'Role' },
            { key: 'status', header: 'Status', render: (r) => <Badge variant={STATUS_VARIANT[r.status as keyof typeof STATUS_VARIANT]}>{r.status}</Badge> },
          ]}
        />
      </Section>

      <Section title="Tabs, breadcrumbs, navigation">
        <Tabs
          tabs={[{ key: 'one', label: 'Overview' }, { key: 'two', label: 'Activity' }, { key: 'three', label: 'Settings' }]}
          activeTab={tab}
          onChange={setTab}
        />
        <NavigationProvider
          config={{ items: NAV_ITEMS, activeKey: 'users', onNavigate: () => undefined, breadcrumbs: [{ label: 'Home', path: '/' }, { label: 'Users' }] }}
        >
          <div style={{ margin: 'var(--maw-space-md) 0' }}><Breadcrumbs /></div>
          <div style={{ height: 220, width: 240, position: 'relative', overflow: 'hidden', border: '1px solid var(--maw-border)', borderRadius: 'var(--maw-radius-md)' }}>
            <Sidebar title="Sidebar" style={{ position: 'static', height: '100%' }} />
          </div>
        </NavigationProvider>
      </Section>

      <Section title="Badges & alerts">
        <Stack direction="row" gap="var(--maw-space-sm)" style={{ flexWrap: 'wrap', marginBottom: 'var(--maw-space-md)' }}>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Error</Badge>
          <Badge variant="info">Info</Badge>
        </Stack>
        <Alert variant="success" title="Success">Saved.</Alert>
        <Alert variant="danger" title="Error">Something failed.</Alert>
      </Section>

      <Section title="Modal, dropdown, dashboard widget">
        <Stack direction="row" gap="var(--maw-space-md)" align="center" style={{ flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={() => setModal(true)}>Open modal</Button>
          <DropdownMenu
            trigger={<Button variant="secondary">Dropdown ▾</Button>}
            items={[
              { key: 'edit', label: 'Edit', onClick: () => undefined },
              { key: 'del', label: 'Delete', danger: true, onClick: () => undefined },
              { key: 'dis', label: 'Disabled', disabled: true, onClick: () => undefined },
            ]}
          />
          <div style={{ minWidth: 220 }}><KpiCard label="Revenue" value="$12,480" change={8.2} changeLabel="vs last month" /></div>
        </Stack>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title="Modal title"
          footer={<><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button onClick={() => setModal(false)}>Confirm</Button></>}
        >
          Modal body content.
        </Modal>
      </Section>
      </ReferenceCompare>
      </Section>
    </div>
  );
}
