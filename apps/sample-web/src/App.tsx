import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { EXAMPLE_RBAC } from '@maw/rbac-core';
import {
  AuthProvider,
  DynamicAccessProvider,
  useAuth,
  NavigationProvider,
  AppShell,
  Sidebar,
  Breadcrumbs,
  useI18n,
  useColorMode,
  useToast,
  Button,
  Badge,
  Avatar,
  type NavItem,
  type NavigationConfig,
} from '@maw/ui-web';
import { client } from './api';
import { loadDynamicAccess, restoreSession } from './session';
import { LoginForm } from './shell/LoginForm';
import { DashboardView } from './shell/Dashboard';
import { OrdersView } from './features/orders';
import { ReportsView } from './features/reports';
import { InventoryView } from './features/inventory';
import { BillingView } from './features/billing';
import { AuditLogsView } from './features/audit-logs';
import { UsersView } from './features/users';
import { ShowcaseView } from './features/showcase';

type Page = 'dashboard' | 'orders' | 'reports' | 'inventory' | 'billing' | 'users' | 'audit-logs' | 'showcase';

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard', group: 'Main', sortOrder: 0 },
  { key: 'orders', label: 'Orders', icon: '📦', path: '/orders', group: 'Main', sortOrder: 1 },
  { key: 'reports', label: 'Reports', icon: '📈', path: '/reports', group: 'Main', sortOrder: 2 },
  { key: 'inventory', label: 'Inventory', icon: '📋', path: '/inventory', group: 'Main', sortOrder: 3 },
  { key: 'billing', label: 'Billing', icon: '💳', path: '/billing', group: 'Finance', sortOrder: 4 },
  { key: 'users', label: 'Users', icon: '👤', path: '/users', group: 'Admin', sortOrder: 5, permission: 'Read_Users' },
  { key: 'audit-logs', label: 'Audit Logs', icon: '📝', path: '/audit-logs', group: 'Admin', sortOrder: 6 },
  { key: 'showcase', label: 'UI Showcase', icon: '🎨', path: '/showcase', group: 'Dev', sortOrder: 99 },
];

function PageContent({ page }: { page: Page }): ReactNode {
  switch (page) {
    case 'dashboard': return <DashboardView />;
    case 'orders': return <OrdersView />;
    case 'reports': return <ReportsView />;
    case 'inventory': return <InventoryView />;
    case 'billing': return <BillingView />;
    case 'users': return <UsersView />;
    case 'audit-logs': return <AuditLogsView />;
    case 'showcase': return <ShowcaseView />;
  }
}

function Shell(): ReactNode {
  const { session, loading, logout } = useAuth();
  const { t, locale, setLocale, availableLocales } = useI18n();
  const { isDark, toggleColorMode } = useColorMode();
  const toast = useToast();
  const [page, setPage] = useState<Page>('dashboard');

  const navigate = useCallback((path: string) => {
    const key = path.replace('/', '') as Page;
    setPage(key);
  }, []);

  const navConfig = useMemo<NavigationConfig>(() => ({
    items: NAV_ITEMS,
    activeKey: page,
    onNavigate: navigate,
    breadcrumbs: [
      { label: 'Home', path: '/dashboard' },
      { label: NAV_ITEMS.find((n) => n.key === page)?.label ?? page },
    ],
  }), [page, navigate]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--maw-fgMuted)' }}>{t('common.loading')}</div>;
  if (session === null) return <LoginForm />;

  return (
    <NavigationProvider config={navConfig}>
      <AppShell
        sidebar={
          <Sidebar
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <span style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)' }}>MAW Foundation</span>
              </div>
            }
            footer={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={session.userId} size={28} />
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
                  {session.userId}
                </div>
              </div>
            }
          />
        }
        header={
          <>
            <Breadcrumbs />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={locale}
                onChange={(e) => {
                  setLocale(e.target.value);
                  toast.info(`Language: ${e.target.value.toUpperCase()}`);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--maw-radius-sm)',
                  border: '1px solid var(--maw-border)',
                  fontSize: 'var(--maw-text-xs)',
                  background: 'var(--maw-bg)',
                  color: 'var(--maw-fg)',
                }}
              >
                {availableLocales.map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                onClick={toggleColorMode}
                style={{ padding: '4px 10px', fontSize: 14 }}
              >
                {isDark ? '☀️' : '🌙'}
              </Button>
              <Badge variant="info">{session.role}</Badge>
              <Button variant="ghost" onClick={() => void logout()} style={{ fontSize: 'var(--maw-text-sm)' }}>
                {t('auth.logout')}
              </Button>
            </div>
          </>
        }
      >
        <PageContent page={page} />
      </AppShell>
    </NavigationProvider>
  );
}

export function App(): ReactNode {
  const rbac = useMemo(() => EXAMPLE_RBAC, []);
  return (
    <AuthProvider client={client} rbac={rbac} restore={restoreSession}>
      <DynamicAccessProvider load={loadDynamicAccess}>
        <Shell />
      </DynamicAccessProvider>
    </AuthProvider>
  );
}
