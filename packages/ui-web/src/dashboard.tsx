import { useEffect, type ReactNode, type CSSProperties } from 'react';
import { Card, Grid, Stack } from './components';
import { useResponsiveProp, type ResponsiveProp } from './responsive';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KpiConfig {
  label: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color?: string;
}

export interface WidgetConfig {
  key: string;
  title: string;
  span?: 1 | 2 | 3 | 4;
  height?: number;
  render: () => ReactNode;
  permission?: string;
}

// ---------------------------------------------------------------------------
// KpiCard — uses Card from components
// ---------------------------------------------------------------------------

export function KpiCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  color,
  style,
}: KpiConfig & { style?: CSSProperties }): ReactNode {
  const isPositive = change !== undefined && change >= 0;
  return (
    <Card style={{ padding: 'var(--maw-space-xl)', ...style }}>
      <Stack direction="column" gap="4px">
        <Stack direction="row" align="center" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </span>
          {icon !== undefined && (
            <span style={{ fontSize: 20, color: color ?? 'var(--maw-brand)' }}>{icon}</span>
          )}
        </Stack>
        <div style={{ fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: color ?? 'var(--maw-fg)' }}>
          {value}
        </div>
        {change !== undefined && (
          <Stack direction="row" align="center" gap="4px">
            <span style={{ fontSize: 'var(--maw-text-xs)', color: isPositive ? 'var(--maw-success)' : 'var(--maw-danger)' }}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}%
            </span>
            {changeLabel !== undefined && <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{changeLabel}</span>}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// KpiGrid — row of KPI cards
// ---------------------------------------------------------------------------

export function KpiGrid({
  kpis,
  columns = { xs: 1, sm: 2, lg: 4 },
  style,
}: {
  kpis: readonly KpiConfig[];
  columns?: ResponsiveProp<number>;
  style?: CSSProperties;
}): ReactNode {
  return (
    <Grid
      columns={columns}
      gap="var(--maw-space-lg)"
      style={{ marginBottom: 'var(--maw-space-xl)', ...style }}
    >
      {kpis.map((kpi, i) => (
        <KpiCard key={i} {...kpi} />
      ))}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Widget — uses Card from components
// ---------------------------------------------------------------------------

export function Widget({
  title,
  actions,
  children,
  span = 1,
  height,
  style,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  span?: ResponsiveProp<1 | 2 | 3 | 4>;
  height?: number;
  style?: CSSProperties;
}): ReactNode {
  const currentSpan = useResponsiveProp(span, 1);

  return (
    <Card
      padding="0"
      style={{
        gridColumn: `span ${currentSpan}`,
        display: 'flex',
        flexDirection: 'column',
        height,
        overflow: 'hidden',
        ...style,
      }}
    >
      <Stack
        direction="row"
        align="center"
        style={{
          justifyContent: 'space-between',
          padding: 'var(--maw-space-md) var(--maw-space-lg)',
          borderBottom: '1px solid var(--maw-border)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 'var(--maw-text-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h3>
        {actions}
      </Stack>
      <div style={{ flex: 1, padding: 'var(--maw-space-lg)', overflowY: 'auto' }}>
        {children}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// WidgetGrid — CSS grid for widgets
// ---------------------------------------------------------------------------

export function WidgetGrid({
  children,
  columns = { xs: 1, md: 2, xl: 4 },
  style,
}: {
  children: ReactNode;
  columns?: ResponsiveProp<number>;
  style?: CSSProperties;
}): ReactNode {
  return (
    <Grid columns={columns} gap="var(--maw-space-lg)" style={style}>
      {children}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// DashboardPage — standard dashboard layout
// ---------------------------------------------------------------------------

export function DashboardPage({
  title,
  subtitle,
  headerActions,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={style}>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>{title}</h1>
          {subtitle !== undefined && <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{subtitle}</p>}
        </div>
        {headerActions}
      </Stack>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MiniChart — simple inline bar/line visual (no charting library dependency)
// ---------------------------------------------------------------------------

export function MiniBarChart({
  data,
  height = 60,
  barColor = 'var(--maw-brand)',
  style,
}: {
  data: readonly number[];
  height?: number;
  barColor?: string;
  style?: CSSProperties;
}): ReactNode {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);

  return (
    <Stack direction="row" align="flex-end" gap="2px" style={{ height, ...style }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: barColor,
            borderRadius: '2px 2px 0 0',
            minHeight: 2,
            transition: 'var(--maw-transition-normal)',
          }}
          title={String(v)}
        />
      ))}
    </Stack>
  );
}

export function MiniLineChart({
  data,
  width = 120,
  height = 40,
  color = 'var(--maw-brand)',
  style,
}: {
  data: readonly number[];
  width?: number;
  height?: number;
  color?: string;
  style?: CSSProperties;
}): ReactNode {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={style}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// useAutoRefresh — periodically refresh dashboard data
// ---------------------------------------------------------------------------

export function useAutoRefresh(callback: () => void | Promise<void>, intervalMs: number, enabled = true): void {
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    const id = setInterval(() => { void callback(); }, intervalMs);
    return () => clearInterval(id);
  }, [callback, intervalMs, enabled]);
}

// ---------------------------------------------------------------------------
// Activity list (recent events / feed)
// ---------------------------------------------------------------------------

export interface ActivityItem {
  id: string;
  icon?: string;
  title: string;
  description?: string;
  timestamp: string;
  color?: string;
}

export function ActivityFeed({
  items,
  emptyMessage = 'No recent activity',
  style,
}: {
  items: readonly ActivityItem[];
  emptyMessage?: string;
  style?: CSSProperties;
}): ReactNode {
  if (items.length === 0) {
    return <div style={{ textAlign: 'center', padding: 'var(--maw-space-xl)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>{emptyMessage}</div>;
  }
  return (
    <Stack direction="column" gap="0px" style={style}>
      {items.map((item) => (
        <Stack
          key={item.id}
          direction="row"
          gap="var(--maw-space-md)"
          style={{ padding: 'var(--maw-space-sm) 0', borderBottom: '1px solid var(--maw-border)' }}
        >
          {item.icon !== undefined && (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: item.color ?? 'var(--maw-bgMuted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {item.icon}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)', fontWeight: 500 }}>{item.title}</div>
            {item.description !== undefined && (
              <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 1 }}>{item.description}</div>
            )}
          </div>
          <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {item.timestamp}
          </div>
        </Stack>
      ))}
    </Stack>
  );
}
