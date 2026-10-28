import { useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import type { LayoutSettings, ResolvedLayout } from '@mawsoftwares/layout';
import { Avatar } from '../components/Avatar';
import { ActivityFeed, KpiGrid, MiniBarChart, Widget, WidgetGrid, type KpiConfig } from '../dashboard';
import { Icon, IconButton, SearchBar } from '../kit';
import { AppShell, Breadcrumbs, NavigationProvider, Sidebar, type NavItem } from '../navigation';
import { useContainerWidth } from '../responsive';
import { describePreview, previewState, PREVIEW_VIEWPORTS, type PreviewViewport } from './viewport';

/** Logical frame heights per viewport (px) — tall enough to show header, KPIs, a chart and the footer. */
const FRAME_HEIGHT: Readonly<Record<PreviewViewport, number>> = { desktop: 720, tablet: 920, mobile: 780 };

const SAMPLE_NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', path: '/dashboard', group: 'Main' },
  { key: 'orders', label: 'Orders', icon: 'shopping-cart', path: '/orders', group: 'Main' },
  { key: 'customers', label: 'Customers', icon: 'users', path: '/customers', group: 'Main' },
  { key: 'inventory', label: 'Inventory', icon: 'clipboard-list', path: '/inventory', group: 'Main' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart', path: '/reports', group: 'Main' },
  { key: 'billing', label: 'Billing', icon: 'credit-card', path: '/billing', group: 'Finance' },
  { key: 'settings', label: 'Settings', icon: 'settings', path: '/settings', group: 'Admin' },
];
const SAMPLE_CRUMBS = [{ label: 'Home', path: '/dashboard' }, { label: 'Dashboard' }];
const SAMPLE_KPIS: KpiConfig[] = [
  { label: 'Total orders', value: '1,247', change: 12.5, changeLabel: 'vs last month', icon: 'shopping-cart' },
  { label: 'Revenue', value: '₹9,20,000', change: 8.2, changeLabel: 'vs last month', icon: 'credit-card' },
  { label: 'Active users', value: 42, change: -3.1, changeLabel: 'vs last week', icon: 'users' },
  { label: 'Pending', value: 7 },
];
const SAMPLE_BARS = [42, 58, 31, 49, 66, 80, 61, 54, 72, 90, 58, 76];
const SAMPLE_ACTIVITY = [
  { id: '1', icon: '📦', title: 'New order #1042', description: 'Widget A × 5', timestamp: '2 min ago' },
  { id: '2', icon: '💳', title: 'Bill #B-201 paid', description: '₹4,200', timestamp: '15 min ago' },
  { id: '3', icon: '👤', title: 'Manager logged in', timestamp: '1 hr ago' },
];

/** Sample page content. Fixed column counts: the window's width must not decide how a 390px preview lays out. */
function SampleDashboard({ width }: { width: number }): ReactNode {
  const columns = width >= 1100 ? 4 : width >= 700 ? 2 : 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--maw-space-lg)' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Welcome back</h1>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>Here&apos;s what&apos;s happening today</p>
      </div>
      <KpiGrid kpis={SAMPLE_KPIS} columns={columns} style={{ marginBottom: 0 }} />
      <WidgetGrid columns={width >= 700 ? 2 : 1}>
        <Widget title="Orders (12 months)" height={200}>
          <MiniBarChart data={SAMPLE_BARS} height={120} />
        </Widget>
        <Widget title="Recent activity" height={200}>
          <ActivityFeed items={SAMPLE_ACTIVITY} />
        </Widget>
      </WidgetGrid>
    </div>
  );
}

const slotIcon = (name: string, label: string): ReactNode => (
  <IconButton label={label} tabIndex={-1}>
    <Icon name={name} size={18} />
  </IconButton>
);

export interface ShellPreviewProps {
  readonly presetId: string;
  readonly label: string;
  readonly settings: LayoutSettings;
  readonly viewport: PreviewViewport;
  /** CSS variables from the Theme Engine, applied only inside this frame. */
  readonly cssVars?: Readonly<Record<string, string>>;
  /** Fixed display scale (gallery thumbnails). Omit to fit the available width. */
  readonly scale?: number;
}

/**
 * The REAL application shell (the same `AppShell`, `Sidebar` and kit components the app uses) rendered with sample
 * content, at the chosen viewport width, scaled into its frame. It is isolated from the running app: its own
 * navigation context, theme variables scoped to the frame, responsive rules evaluated at the preview's width rather
 * than the window's, and inert — nothing in it can be clicked, focused or navigate.
 */
export function ShellPreview({ presetId, label, settings, viewport, cssVars, scale }: ShellPreviewProps): ReactNode {
  const wrapper = useRef<HTMLDivElement>(null);
  const available = useContainerWidth(wrapper);
  const width = PREVIEW_VIEWPORTS[viewport].width;
  const height = FRAME_HEIGHT[viewport];
  const k = scale ?? (available > 0 ? Math.min(1, available / width) : 0.5);

  const layout = useMemo<ResolvedLayout>(() => ({ presetId, label, settings, source: 'config', issues: [] }), [presetId, label, settings]);
  const navConfig = useMemo(() => ({ items: SAMPLE_NAV, activeKey: 'dashboard', onNavigate: () => undefined, breadcrumbs: SAMPLE_CRUMBS }), []);
  const slots = useMemo<Record<string, ReactNode>>(
    () => ({
      search: <div style={{ width: 240 }}><SearchBar value="" onChange={() => undefined} placeholder="Search anything" /></div>,
      notifications: slotIcon('notifications', 'Notifications'),
      'theme-toggle': slotIcon('palette', 'Theme'),
    }),
    [],
  );
  const state = previewState(settings, width);

  const frameStyle = {
    ...(cssVars as CSSProperties),
    '--maw-shell-height': `${height}px`,
    width,
    height,
    transform: `scale(${k})`,
    transformOrigin: 'top left',
    position: 'relative',
    overflow: 'hidden',
    pointerEvents: 'none',
    userSelect: 'none',
    background: 'var(--maw-canvas)',
    color: 'var(--maw-fg)',
    fontFamily: 'var(--maw-font-family)',
  } as CSSProperties;

  return (
    <div ref={wrapper} style={{ width: '100%', height: height * k, overflow: 'hidden', borderRadius: 8 }}>
      <div role="img" aria-label={`${PREVIEW_VIEWPORTS[viewport].label} preview: ${describePreview(state)}`} data-viewport={viewport} style={frameStyle} inert>
        <NavigationProvider config={navConfig}>
          <AppShell
            layout={layout}
            viewportWidth={width}
            slots={slots}
            rightPanel={
              <div>
                <h3 style={{ margin: '0 0 var(--maw-space-md)', fontSize: 'var(--maw-text-md)' }}>Profile</h3>
                <ActivityFeed items={SAMPLE_ACTIVITY} />
              </div>
            }
            rightPanelLabel="Profile"
            sidebar={
              <Sidebar
                logo={<Icon name="zap" size={22} />}
                title="Acme Co."
                footer={(collapsed) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, justifyContent: collapsed ? 'center' : undefined, width: '100%' }}>
                    <Avatar name="Dr Kennedy" size={28} />
                    {!collapsed && <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-shell-fg-muted, var(--maw-fgMuted))' }}>Dr Kennedy</span>}
                  </div>
                )}
              />
            }
            header={<Breadcrumbs />}
            actions={<Avatar name="Dr Kennedy" size={32} />}
          >
            <SampleDashboard width={width} />
          </AppShell>
        </NavigationProvider>
      </div>
    </div>
  );
}
