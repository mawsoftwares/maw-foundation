import type { ReactNode } from 'react';
import { useAuth, useI18n, useCountUp, HeroBanner, KpiGrid, WidgetGrid, Widget, MiniBarChart, MiniLineChart, ActivityFeed } from '@mawsoftwares/ui-web';

const SAMPLE_ORDERS = [12, 19, 8, 15, 22, 30, 25, 18, 27, 35, 20, 28];
const SAMPLE_REVENUE = [45000, 52000, 48000, 61000, 55000, 72000, 68000, 75000, 81000, 79000, 85000, 92000];

const ACTIVITY: Parameters<typeof ActivityFeed>[0]['items'] = [
  { id: '1', icon: '📦', title: 'New order #1042', description: 'Widget A x 5 — clerk@demo.test', timestamp: '2 min ago' },
  { id: '2', icon: '💳', title: 'Bill #B-201 paid', description: 'Amount: ₹4,200', timestamp: '15 min ago' },
  { id: '3', icon: '👤', title: 'User manager@ logged in', timestamp: '1 hr ago' },
  { id: '4', icon: '📋', title: 'Inventory updated', description: 'Widget A stock: 150 → 145', timestamp: '2 hrs ago' },
  { id: '5', icon: '📈', title: 'Q3 report generated', timestamp: '3 hrs ago' },
];

const KPI_TARGETS = [1247, 920000, 42, 7] as const;
const formatCount = (n: number): string => n.toLocaleString('en-IN');

export function DashboardView(): ReactNode {
  const { session } = useAuth();
  const { t } = useI18n();

  const [orders = 0, revenue = 0, activeUsers = 0, pendingBills = 0] = useCountUp(KPI_TARGETS);

  return (
    <div>
      <HeroBanner
        title={t('dashboard.welcome', { name: session?.userId ?? 'User' })}
        subtitle="Here's what's happening today"
        style={{ marginBottom: 'var(--maw-space-xl)', padding: 'var(--maw-space-xxl)' }}
      />
      <KpiGrid
        kpis={[
          { label: t('dashboard.totalOrders'), value: formatCount(orders), change: 12.5, changeLabel: 'vs last month', icon: '📦', trend: [18, 22, 19, 26, 24, 31, 35] },
          { label: t('dashboard.revenue'), value: `₹${formatCount(revenue)}`, change: 8.2, changeLabel: 'vs last month', icon: '💰', trend: [40, 44, 43, 49, 52, 51, 58] },
          { label: t('dashboard.activeUsers'), value: formatCount(activeUsers), change: -3.1, changeLabel: 'vs last week', icon: '👥', trend: [48, 47, 49, 46, 45, 44, 42] },
          { label: t('dashboard.pendingBills'), value: formatCount(pendingBills), change: -15, changeLabel: 'vs last month', icon: '💳', color: 'var(--maw-warning)', trend: [14, 12, 11, 10, 9, 8, 7] },
        ]}
      />

      <WidgetGrid columns={3}>
        <Widget title="Orders (12 months)" span={2} height={240}>
          <MiniBarChart data={SAMPLE_ORDERS} height={160} />
        </Widget>

        <Widget title="Revenue Trend" height={240}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <MiniLineChart data={SAMPLE_REVENUE} width={200} height={80} />
            <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>Last 12 months</span>
          </div>
        </Widget>

        <Widget title="Recent Activity" span={2}>
          <ActivityFeed items={ACTIVITY} />
        </Widget>

        <Widget title="Quick Stats">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 'var(--maw-text-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--maw-fgMuted)' }}>SKUs in stock</span>
              <strong>156</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--maw-fgMuted)' }}>Low stock items</span>
              <strong style={{ color: 'var(--maw-warning)' }}>3</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--maw-fgMuted)' }}>Open invoices</span>
              <strong>12</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--maw-fgMuted)' }}>Modules active</span>
              <strong style={{ color: 'var(--maw-success)' }}>6</strong>
            </div>
          </div>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
