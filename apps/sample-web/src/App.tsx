import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { createConfigEngine } from '@maw/sdk/config/config-engine';
import { EXAMPLE_RBAC } from '@maw/rbac-core';
import {
  AuthProvider,
  DynamicAccessProvider,
  useAuth,
  useBrand,
  NavigationProvider,
  AppShell,
  Sidebar,
  Breadcrumbs,
  useI18n,
  useToast,
  Button,
  Badge,
  Avatar,
  OfflineProvider,
  NetworkStatusBadge,
  OfflineBanner,
  SyncStatusIndicator,
  type NavItem,
  type NavigationConfig,
} from '@maw/ui-web';
import { client } from './api';
import { loadDynamicAccess, restoreSession } from './session';
import { setupOffline } from './offline-setup';
import { AVAILABLE_TENANTS } from './brand-setup';
import { LoginForm } from './shell/LoginForm';
import { RegisterForm } from './shell/RegisterForm';
import { ForgotPasswordForm } from './shell/ForgotPasswordForm';
import { ResetPasswordForm } from './shell/ResetPasswordForm';
import { DashboardView } from './shell/Dashboard';
import { OrdersView } from './features/orders';
import { ReportsView } from './features/reports';
import { InventoryView } from './features/inventory';
import { BillingView } from './features/billing';
import { AuditLogsView } from './features/audit-logs';
import { UsersView } from './features/users';
import { ShowcaseView } from './features/showcase';
import { SettingsView } from './features/settings';
import { AccountView } from './features/account';

// Offline infrastructure — created once; enabled/disabled via Settings toggle
const config = createConfigEngine();
config.loadLayer('app', { offline: { enabled: true } });
const offlineInfra = setupOffline(config, client, 'demo-tenant');

type Page = 'dashboard' | 'orders' | 'reports' | 'inventory' | 'billing' | 'users' | 'audit-logs' | 'showcase' | 'settings' | 'account';

type AuthPage = 'login' | 'register' | 'forgot' | 'reset';

const SUPERADMIN_ROLES = new Set(['owner', 'super_admin']);

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard', group: 'Main', sortOrder: 0 },
  { key: 'orders', label: 'Orders', icon: '📦', path: '/orders', group: 'Main', sortOrder: 1 },
  { key: 'reports', label: 'Reports', icon: '📈', path: '/reports', group: 'Main', sortOrder: 2 },
  { key: 'inventory', label: 'Inventory', icon: '📋', path: '/inventory', group: 'Main', sortOrder: 3 },
  { key: 'billing', label: 'Billing', icon: '💳', path: '/billing', group: 'Finance', sortOrder: 4 },
  { key: 'users', label: 'Users', icon: '👤', path: '/users', group: 'Admin', sortOrder: 5, permission: 'Read_Users' },
  { key: 'audit-logs', label: 'Audit Logs', icon: '📝', path: '/audit-logs', group: 'Admin', sortOrder: 6 },
  { key: 'account', label: 'Account', icon: '🔐', path: '/account', group: 'Admin', sortOrder: 7 },
  { key: 'settings', label: 'Settings', icon: '⚙️', path: '/settings', group: 'Admin', sortOrder: 8 },
  { key: 'showcase', label: 'UI Showcase', icon: '🎨', path: '/showcase', group: 'Dev', sortOrder: 99 },
];

const SUPERADMIN_ONLY_KEYS = new Set(['settings', 'showcase']);

function PageContent({ page, onFeatureChange, featureOverrides }: {
  page: Page;
  onFeatureChange?: (key: string, enabled: boolean) => void;
  featureOverrides?: Record<string, boolean>;
}): ReactNode {
  switch (page) {
    case 'dashboard': return <DashboardView />;
    case 'orders': return <OrdersView />;
    case 'reports': return <ReportsView />;
    case 'inventory': return <InventoryView />;
    case 'billing': return <BillingView />;
    case 'users': return <UsersView />;
    case 'audit-logs': return <AuditLogsView />;
    case 'account': return <AccountView />;
    case 'settings': return <SettingsView onFeatureChange={onFeatureChange} featureOverrides={featureOverrides} />;
    case 'showcase': return <ShowcaseView />;
  }
}

function Shell({ offlineEnabled, setOfflineEnabled }: {
  offlineEnabled: boolean;
  setOfflineEnabled: (v: boolean) => void;
}): ReactNode {
  const { session, loading, logout } = useAuth();
  const { t, locale, setLocale, availableLocales } = useI18n();
  const { isDark, toggleColorMode, brand, switchTenant } = useBrand();
  const toast = useToast();
  const [page, setPage] = useState<Page>('dashboard');
  const [authPage, setAuthPage] = useState<AuthPage>('login');

  const navigate = useCallback((path: string) => {
    const key = path.replace('/', '') as Page;
    setPage(key);
  }, []);

  const handleFeatureChange = useCallback((key: string, enabled: boolean) => {
    if (key === 'offline') setOfflineEnabled(enabled);
  }, [setOfflineEnabled]);

  const featureOverrides = useMemo(() => ({ offline: offlineEnabled }), [offlineEnabled]);

  const isSuperadmin = session !== null && SUPERADMIN_ROLES.has(session.role);

  const navConfig = useMemo<NavigationConfig>(() => {
    const items = isSuperadmin
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) => !SUPERADMIN_ONLY_KEYS.has(item.key));
    return {
      items,
      activeKey: page,
      onNavigate: navigate,
      breadcrumbs: [
        { label: 'Home', path: '/dashboard' },
        { label: NAV_ITEMS.find((n) => n.key === page)?.label ?? page },
      ],
    };
  }, [page, navigate, isSuperadmin]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--maw-fgMuted)' }}>{t('common.loading')}</div>;
  if (session === null) {
    switch (authPage) {
      case 'register': return <RegisterForm onSwitchToLogin={() => setAuthPage('login')} />;
      case 'forgot': return <ForgotPasswordForm onSwitchToLogin={() => setAuthPage('login')} onResetReady={() => setAuthPage('reset')} />;
      case 'reset': return <ResetPasswordForm onSwitchToLogin={() => setAuthPage('login')} />;
      default: return <LoginForm onSwitchToRegister={() => setAuthPage('register')} onSwitchToForgot={() => setAuthPage('forgot')} />;
    }
  }

  return (
    <NavigationProvider config={navConfig}>
      <AppShell
        sidebar={
          <Sidebar
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <span style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)' }}>{brand.name}</span>
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
                value={brand.tenantId}
                onChange={(e) => {
                  void switchTenant(e.target.value);
                  toast.success(`Brand: ${e.target.value}`);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--maw-radius-sm)',
                  border: '2px solid var(--maw-brand)',
                  fontSize: 'var(--maw-text-xs)',
                  background: 'var(--maw-bg)',
                  color: 'var(--maw-fg)',
                  fontWeight: 600,
                }}
              >
                {AVAILABLE_TENANTS.map((tid) => (
                  <option key={tid} value={tid}>{tid}</option>
                ))}
              </select>
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
              <NetworkStatusBadge />
              <SyncStatusIndicator />
              <Badge variant="info">{session.role}</Badge>
              <Button variant="ghost" onClick={() => void logout()} style={{ fontSize: 'var(--maw-text-sm)' }}>
                {t('auth.logout')}
              </Button>
            </div>
          </>
        }
      >
        <OfflineBanner style={{ marginBottom: 'var(--maw-space-md)' }} />
        <PageContent page={page} onFeatureChange={handleFeatureChange} featureOverrides={featureOverrides} />
      </AppShell>
    </NavigationProvider>
  );
}

export function App(): ReactNode {
  const rbac = useMemo(() => EXAMPLE_RBAC, []);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  return (
    <AuthProvider client={client} rbac={rbac} restore={restoreSession}>
      <DynamicAccessProvider load={loadDynamicAccess}>
        <OfflineProvider
          networkManager={offlineInfra.networkManager}
          syncEngine={offlineInfra.syncEngine}
          enabled={offlineEnabled}
        >
          <Shell offlineEnabled={offlineEnabled} setOfflineEnabled={setOfflineEnabled} />
        </OfflineProvider>
      </DynamicAccessProvider>
    </AuthProvider>
  );
}
