import { useState, useRef, type ReactNode } from 'react';
import {
  Button,
  Card,
  Badge,
  Divider,
  Avatar,
  IconButton,
  TextArea,
  Select,
  Checkbox,
  Toggle,
  Modal,
  Tabs,
  Tooltip,
  Spinner,
  Progress,
  Stack,
  DropdownMenu,
  Skeleton,
  EmptyState,
  ErrorState,
  useToast,
  useColorMode,
  useI18n,
  DataTable,
  FileUpload,
  RadioGroup,
  MultiSelect,
  SearchableSelect,
  DatePicker,
  DateRangePicker,
  TimePicker,
  Drawer,
  Dialog,
  Popover,
  Alert,
  Banner,
  ConfirmationDialog,
  Accordion,
  Panel,
  Section,
  Grid,
  Spacer,
  Wizard,
  SettingsLayout,
  SearchBar,
  type ColumnDef,
  type DateRange,
} from '@maw/ui-web';
import type { StoredFile } from '@maw/sdk/contracts/IFileStorage';
import { client } from '../api';

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

export function ShowcaseView(): ReactNode {
  const toast = useToast();
  const { isDark, toggleColorMode } = useColorMode();
  const { locale, setLocale, t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('buttons');
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [toggleVal, setToggleVal] = useState(false);
  const [textareaVal, setTextareaVal] = useState('');
  const [selectVal, setSelectVal] = useState('');
  const [progress, setProgress] = useState(65);
  const [radioVal, setRadioVal] = useState('email');
  const [multiVal, setMultiVal] = useState<readonly string[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [rangeVal, setRangeVal] = useState<DateRange>({ start: '', end: '' });
  const [timeVal, setTimeVal] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const popoverAnchor = useRef<HTMLButtonElement>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <h1 style={{ color: 'var(--maw-fg)', marginTop: 0, fontSize: 'var(--maw-text-xl)' }}>
        UI Component Showcase
      </h1>
      <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
        All @maw/ui-web components using CSS custom properties — responsive to dark mode and tenant branding.
      </p>

      <Tabs
        tabs={[
          { key: 'buttons', label: 'Buttons & Badges' },
          { key: 'inputs', label: 'Form Inputs' },
          { key: 'advanced', label: 'Advanced Inputs' },
          { key: 'feedback', label: 'Feedback' },
          { key: 'layout', label: 'Layout & Data' },
          { key: 'patterns', label: 'Patterns' },
          { key: 'upload', label: 'File Upload' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 'var(--maw-space-xl)' }}
      />

      {activeTab === 'buttons' && (
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Buttons</h3>
          <Stack direction="row" gap="var(--maw-space-sm)">
            <Button>Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </Stack>

          <Divider />

          <h3 style={{ color: 'var(--maw-fg)' }}>Badges</h3>
          <Stack direction="row" gap="var(--maw-space-sm)">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </Stack>

          <Divider />

          <h3 style={{ color: 'var(--maw-fg)' }}>Avatars</h3>
          <Stack direction="row" gap="var(--maw-space-sm)" align="center">
            <Avatar name="Alice Johnson" size={40} />
            <Avatar name="Bob Smith" size={32} />
            <Avatar name="Charlie" size={24} />
          </Stack>

          <Divider />

          <h3 style={{ color: 'var(--maw-fg)' }}>IconButton & Tooltip</h3>
          <Stack direction="row" gap="var(--maw-space-sm)">
            <Tooltip content="Edit item">
              <IconButton label="Edit">✏️</IconButton>
            </Tooltip>
            <Tooltip content="Delete item">
              <IconButton label="Delete">🗑️</IconButton>
            </Tooltip>
            <Tooltip content="Settings">
              <IconButton label="Settings">⚙️</IconButton>
            </Tooltip>
          </Stack>

          <Divider />

          <h3 style={{ color: 'var(--maw-fg)' }}>DropdownMenu</h3>
          <DropdownMenu
            trigger={<Button variant="ghost">Actions ▾</Button>}
            items={[
              { key: 'edit', label: 'Edit', onClick: () => toast.info('Edit clicked') },
              { key: 'duplicate', label: 'Duplicate', onClick: () => toast.info('Duplicate clicked') },
              { key: 'delete', label: 'Delete', danger: true, onClick: () => toast.warning('Delete clicked') },
            ]}
          />

          <Divider />

          <h3 style={{ color: 'var(--maw-fg)' }}>Theme Controls</h3>
          <Stack direction="row" gap="var(--maw-space-md)" align="center">
            <Button variant="ghost" onClick={toggleColorMode}>
              {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </Button>
            <Select
              options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }, { value: 'mr', label: 'Marathi' }]}
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              style={{ width: 140 }}
            />
          </Stack>
        </Card>
      )}

      {activeTab === 'inputs' && (
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>TextArea</h3>
          <TextArea
            label="Description"
            value={textareaVal}
            onChange={(e) => setTextareaVal(e.target.value)}
            placeholder="Type something..."
          />

          <h3 style={{ color: 'var(--maw-fg)' }}>Select</h3>
          <Select
            label="Category"
            placeholder="Choose..."
            value={selectVal}
            onChange={(e) => setSelectVal(e.target.value)}
            options={[
              { value: 'electronics', label: 'Electronics' },
              { value: 'clothing', label: 'Clothing' },
              { value: 'food', label: 'Food & Beverages' },
            ]}
          />

          <h3 style={{ color: 'var(--maw-fg)' }}>Checkbox & Toggle</h3>
          <Stack direction="column" gap="var(--maw-space-md)">
            <Checkbox label="Enable notifications" checked={checkboxVal} onChange={setCheckboxVal} />
            <Checkbox label="Disabled option" checked={false} onChange={() => {}} disabled />
            <Toggle label="Dark mode" checked={toggleVal} onChange={setToggleVal} />
          </Stack>
        </Card>
      )}

      {activeTab === 'advanced' && (
        <Stack direction="column" gap="var(--maw-space-lg)">
          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>RadioGroup</h3>
            <RadioGroup
              label="Notification method"
              name="notify"
              value={radioVal}
              onChange={setRadioVal}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'push', label: 'Push notification' },
                { value: 'none', label: 'None', disabled: true },
              ]}
            />
            <RadioGroup
              label="Layout direction"
              name="direction"
              value={radioVal}
              onChange={setRadioVal}
              direction="row"
              options={[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'push', label: 'Push' },
              ]}
            />
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>MultiSelect</h3>
            <MultiSelect
              label="Assign tags"
              value={multiVal}
              onChange={setMultiVal}
              options={[
                { value: 'urgent', label: 'Urgent' },
                { value: 'bug', label: 'Bug' },
                { value: 'feature', label: 'Feature' },
                { value: 'docs', label: 'Documentation' },
                { value: 'perf', label: 'Performance' },
                { value: 'security', label: 'Security' },
              ]}
              placeholder="Search tags..."
              maxSelections={4}
            />
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>SearchableSelect</h3>
            <SearchableSelect
              label="Country"
              value={searchVal}
              onChange={setSearchVal}
              options={[
                { value: 'us', label: 'United States' },
                { value: 'uk', label: 'United Kingdom' },
                { value: 'in', label: 'India' },
                { value: 'de', label: 'Germany' },
                { value: 'fr', label: 'France' },
                { value: 'jp', label: 'Japan' },
                { value: 'au', label: 'Australia' },
                { value: 'ca', label: 'Canada' },
              ]}
              placeholder="Search countries..."
              clearable
            />
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>DatePicker</h3>
            <DatePicker
              label="Start date"
              value={dateVal}
              onChange={setDateVal}
              required
            />

            <h3 style={{ color: 'var(--maw-fg)' }}>DateRangePicker</h3>
            <DateRangePicker
              label="Report period"
              value={rangeVal}
              onChange={setRangeVal}
            />
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>TimePicker</h3>
            <Stack direction="row" gap="var(--maw-space-lg)">
              <div style={{ flex: 1 }}>
                <TimePicker
                  label="Meeting time (12h)"
                  value={timeVal}
                  onChange={setTimeVal}
                  step={30}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TimePicker
                  label="Meeting time (24h)"
                  value={timeVal}
                  onChange={setTimeVal}
                  step={15}
                  use24Hour
                />
              </div>
            </Stack>
          </Card>
        </Stack>
      )}

      {activeTab === 'feedback' && (
        <Stack direction="column" gap="var(--maw-space-lg)">
          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Toast Notifications</h3>
            <Stack direction="row" gap="var(--maw-space-sm)">
              <Button onClick={() => toast.success('Operation successful!')}>Success</Button>
              <Button variant="danger" onClick={() => toast.error('Something went wrong', 'Check the console for details')}>Error</Button>
              <Button variant="ghost" onClick={() => toast.warning('Low stock alert')}>Warning</Button>
              <Button variant="ghost" onClick={() => toast.info('New version available')}>Info</Button>
            </Stack>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Modal</h3>
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Sample Modal"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                  <Button onClick={() => { setModalOpen(false); toast.success('Confirmed!'); }}>{t('common.save')}</Button>
                </>
              }
            >
              <p style={{ color: 'var(--maw-fg)' }}>This is a modal dialog with a title, content, and footer actions.</p>
              <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>Press Escape or click outside to close.</p>
            </Modal>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Progress & Spinner</h3>
            <Stack direction="row" gap="var(--maw-space-md)" align="center">
              <div style={{ flex: 1 }}>
                <Progress value={progress} />
                <Stack direction="row" gap="var(--maw-space-sm)" style={{ marginTop: 'var(--maw-space-sm)' }}>
                  <Button variant="ghost" onClick={() => setProgress(Math.max(0, progress - 10))}>-10</Button>
                  <Button variant="ghost" onClick={() => setProgress(Math.min(100, progress + 10))}>+10</Button>
                </Stack>
              </div>
              <Spinner size={32} />
            </Stack>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Skeleton Loading</h3>
            <Stack direction="column" gap="var(--maw-space-sm)">
              <Skeleton width="60%" height={20} />
              <Skeleton width="100%" height={14} />
              <Skeleton width="80%" height={14} />
              <Skeleton width={120} height={32} borderRadius="var(--maw-radius-md)" />
            </Stack>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Empty & Error States</h3>
            <Stack direction="row" gap="var(--maw-space-lg)">
              <div style={{ flex: 1 }}>
                <EmptyState icon="📦" title="No orders" message="Create your first order to get started" action={<Button>Create Order</Button>} />
              </div>
              <div style={{ flex: 1 }}>
                <ErrorState title="Connection failed" message="Could not reach the server" retry={() => toast.info('Retrying...')} />
              </div>
            </Stack>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Alert</h3>
            <Stack direction="column" gap="var(--maw-space-sm)">
              <Alert variant="info" title="System update">Scheduled maintenance on Sunday 2–4 AM.</Alert>
              <Alert variant="success" title="Payment received">Invoice #1042 has been paid.</Alert>
              <Alert variant="warning">Your subscription expires in 3 days.</Alert>
              <Alert variant="danger" title="Error">Failed to sync 2 records.</Alert>
              {!alertDismissed && (
                <Alert variant="info" onDismiss={() => setAlertDismissed(true)}>This alert is dismissible — click ✕ to remove.</Alert>
              )}
            </Stack>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Banner</h3>
            <Stack direction="column" gap="var(--maw-space-sm)">
              <Banner variant="info">New version 2.1 available.</Banner>
              <Banner variant="warning" action={<Button variant="ghost" onClick={() => toast.info('Upgrading...')}>Upgrade</Button>}>Your plan is expiring soon.</Banner>
              {!bannerDismissed && (
                <Banner variant="success" onDismiss={() => setBannerDismissed(true)}>All systems operational. Click ✕ to dismiss.</Banner>
              )}
            </Stack>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Drawer</h3>
            <Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
            <Drawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              title="Order Details"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Close</Button>
                  <Button onClick={() => { setDrawerOpen(false); toast.success('Saved!'); }}>Save</Button>
                </>
              }
            >
              <p style={{ color: 'var(--maw-fg)' }}>This is a slide-in drawer panel from the right side.</p>
              <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>Press Escape or click the overlay to close.</p>
            </Drawer>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Dialog</h3>
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            <Dialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              title="Edit Profile"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => { setDialogOpen(false); toast.success('Profile updated!'); }}>Save Changes</Button>
                </>
              }
            >
              <p style={{ color: 'var(--maw-fg)' }}>Dialog with role=&quot;dialog&quot;, aria-modal, close button, and overlay click-to-close.</p>
            </Dialog>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Popover</h3>
            <button ref={popoverAnchor} onClick={() => setPopoverOpen(!popoverOpen)} style={{ padding: '8px 16px', borderRadius: 'var(--maw-radius-md)', border: '1px solid var(--maw-border)', background: 'var(--maw-bg)', color: 'var(--maw-fg)', cursor: 'pointer' }}>
              Toggle Popover
            </button>
            <Popover open={popoverOpen} onClose={() => setPopoverOpen(false)} anchorRef={popoverAnchor}>
              <p style={{ margin: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Popover content anchored to the button.</p>
              <p style={{ margin: '4px 0 0', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-xs)' }}>Click outside or press Escape to close.</p>
            </Popover>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>ConfirmationDialog</h3>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete Item</Button>
            <ConfirmationDialog
              open={confirmOpen}
              onConfirm={() => { setConfirmOpen(false); toast.success('Item deleted'); }}
              onCancel={() => setConfirmOpen(false)}
              title="Delete item?"
              message="This action cannot be undone. The item and all associated data will be permanently removed."
              confirmLabel="Delete"
              cancelLabel="Keep it"
              variant="danger"
            />
          </Card>
        </Stack>
      )}

      {activeTab === 'layout' && (
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
      )}

      {activeTab === 'patterns' && (
        <Stack direction="column" gap="var(--maw-space-lg)">
          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Wizard</h3>
            <Wizard
              steps={[
                { key: 'info', title: 'Basic Info', content: <p style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Enter your name and email address.</p> },
                { key: 'plan', title: 'Choose Plan', content: <p style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Select a subscription plan that fits your needs.</p> },
                { key: 'payment', title: 'Payment', content: <p style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Add your payment method to continue.</p> },
                { key: 'review', title: 'Review', content: <p style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Review your selections and confirm.</p> },
              ]}
              activeStep={wizardStep}
              onStepChange={setWizardStep}
              onComplete={() => { setWizardStep(0); toast.success('Wizard completed!'); }}
            />
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>SearchBar</h3>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search orders, items, users…"
              onSearch={(q) => toast.info(`Searching: "${q}"`)}
            />
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>SettingsLayout</h3>
            <SettingsLayout
              groups={[
                {
                  key: 'notifications',
                  title: 'Email notifications',
                  description: 'Choose which emails you want to receive.',
                  children: <Toggle checked={toggleVal} onChange={setToggleVal} label="Marketing emails" />,
                },
                {
                  key: 'language',
                  title: 'Language',
                  description: 'Select your preferred language for the interface.',
                  children: (
                    <Select value={selectVal || 'en'} onChange={(v) => toast.info(`Language: ${v}`)} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }, { value: 'mr', label: 'Marathi' }]} />
                  ),
                },
                {
                  key: 'theme',
                  title: 'Appearance',
                  description: 'Toggle between light and dark mode.',
                  children: <Toggle checked={isDark} onChange={toggleColorMode} label={isDark ? 'Dark mode' : 'Light mode'} />,
                },
              ]}
            />
          </Card>
        </Stack>
      )}

      {activeTab === 'upload' && (
        <Stack direction="column" gap="var(--maw-space-lg)">
          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>File Upload</h3>
            <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)', marginBottom: 'var(--maw-space-md)' }}>
              Drag-and-drop or click to upload. Images show a preview thumbnail. Supports progress tracking and retry on failure.
            </p>
            <FileUpload
              upload={async (file, onProgress) => {
                const formData = new FormData();
                formData.append('files', file);
                onProgress(10);
                const result = await client.upload<{ files: StoredFile[] }>('/files/upload', formData, {
                  onProgress: (e) => onProgress(e.percent),
                });
                return result.files[0]!;
              }}
              onComplete={(files) => toast.success(`${files.length} file(s) uploaded`)}
              onError={(_file, error) => toast.error(error)}
              accept={['image/*', '.pdf', '.csv']}
              maxSize={10 * 1024 * 1024}
              maxFiles={5}
              label="Upload Files"
              hint="Images, PDFs, and CSV files up to 10 MB each (max 5 files)"
            />
          </Card>
        </Stack>
      )}
    </div>
  );
}
