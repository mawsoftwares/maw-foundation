import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { createConfigEngine } from '@mawsoftwares/sdk/config/config-engine';
import { EXAMPLE_RBAC } from '@mawsoftwares/rbac-core';
import {
  AuthProvider,
  DynamicAccessProvider,
  useDynamicAccess,
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
  FeatureFlagProvider,
  useFeatureFlags,
  type NavItem,
  type NavigationConfig,
} from '@mawsoftwares/ui-web';
import { client } from './api';
import { loadDynamicAccess, restoreSession } from './session';
import { setupOffline } from './offline-setup';
import { AVAILABLE_TENANTS } from './brand-setup';
import { LoginForm, RegisterForm, VerifyEmailForm, ForgotPasswordForm, ResetPasswordForm } from '@mawsoftwares/ui-auth';
import { DashboardView } from './shell/Dashboard';
import { OrdersView } from './features/orders';
import { ReportsView } from './features/reports';
import { InventoryView } from './features/inventory';
import { BillingView } from './features/billing';
import { AuditLogsView } from './features/audit-logs';
import { UsersView } from './features/users/index';
import { ShowcaseView } from './features/showcase';
import { SettingsView } from './features/settings';
import { AccountView } from './features/account';
import { MastersView } from './features/masters';
import { PlatformView } from './features/platform';
import { JobsView } from './features/jobs';
import { NotificationsView } from './features/notifications';
import { RbacView } from './features/rbac';
import { FeatureFlagsView } from './features/feature-flags';


// Offline infrastructure — created once; enabled/disabled via Settings toggle
const config = createConfigEngine();
config.loadLayer('app', { offline: { enabled: true } });
const offlineInfra = setupOffline(config, client, 'demo-tenant');

type Page = 'dashboard' | 'orders' | 'reports' | 'inventory' | 'billing' | 'users' | 'rbac' | 'audit-logs' | 'showcase' | 'settings' | 'account' | 'masters' | 'platform' | 'jobs' | 'notifications' | 'feature-flags';

type AuthPage = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

function readAuthDeepLink(): { page: AuthPage; token: string } {
  const params = new URLSearchParams(window.location.search);
  const verifyToken = params.get('verifyToken');
  const resetToken = params.get('resetToken');
  if (verifyToken) return { page: 'verify', token: verifyToken };
  if (resetToken) return { page: 'reset', token: resetToken };
  return { page: 'login', token: '' };
}

function clearAuthQuery(): void {
  if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

const SUPERADMIN_ROLES = new Set(['owner', 'super_admin', 'admin']);

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard', group: 'Main', sortOrder: 0 },
  { key: 'orders', label: 'Orders', icon: '📦', path: '/orders', group: 'Main', sortOrder: 1, permission: 'Read_Orders' },
  { key: 'reports', label: 'Reports', icon: '📈', path: '/reports', group: 'Main', sortOrder: 2, permission: 'Read_Reports' },
  { key: 'inventory', label: 'Inventory', icon: '📋', path: '/inventory', group: 'Main', sortOrder: 3, permission: 'Read_Inventory' },
  { key: 'billing', label: 'Billing', icon: '💳', path: '/billing', group: 'Finance', sortOrder: 4, permission: 'Read_Billing' },
  { key: 'users', label: 'Users', icon: '👤', path: '/users', group: 'Admin', sortOrder: 5, permission: 'Read_Users' },
  { key: 'audit-logs', label: 'Audit Logs', icon: '📝', path: '/audit-logs', group: 'Admin', sortOrder: 6, permission: 'Read_AuditLogs' },
  { key: 'account', label: 'Account', icon: '🔐', path: '/account', group: 'Admin', sortOrder: 7 },
  { key: 'masters', label: 'Master Data', icon: '🗄️', path: '/masters', group: 'Admin', sortOrder: 8, permission: 'Master_View' },
  { key: 'rbac', label: 'RBAC Admin', icon: '🔑', path: '/rbac', group: 'Admin', sortOrder: 8.5 },
  { key: 'feature-flags', label: 'Feature Flags', icon: '🚩', path: '/feature-flags', group: 'Admin', sortOrder: 8.6, permission: 'Read_FeatureFlags' },
  { key: 'settings', label: 'Settings', icon: '⚙️', path: '/settings', group: 'Admin', sortOrder: 9 },
  { key: 'platform', label: 'Platform', icon: '🧩', path: '/platform', group: 'Dev', sortOrder: 95 },
  { key: 'jobs', label: 'Jobs', icon: '⏳', path: '/jobs', group: 'Dev', sortOrder: 96 },
  { key: 'notifications', label: 'Notifications', icon: '🔔', path: '/notifications', group: 'Dev', sortOrder: 97 },
  { key: 'showcase', label: 'UI Showcase', icon: '🎨', path: '/showcase', group: 'Dev', sortOrder: 99 },
];

/** Maps a page key to the permission required to view it. */
const PAGE_PERMISSIONS: Partial<Record<Page, string>> = {
  orders: 'Read_Orders',
  reports: 'Read_Reports',
  inventory: 'Read_Inventory',
  billing: 'Read_Billing',
  users: 'Read_Users',
  'audit-logs': 'Read_AuditLogs',
  masters: 'Master_View',
  'feature-flags': 'Read_FeatureFlags',
};

const SUPERADMIN_ONLY_KEYS = new Set(['settings', 'showcase', 'platform', 'jobs', 'notifications', 'rbac']);

function AccessDenied({ permission }: { permission: string }): ReactNode {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <h2 style={{ margin: 0, color: 'var(--maw-fg)' }}>Access Denied</h2>
      <p style={{ color: 'var(--maw-fgMuted)', maxWidth: 360 }}>
        You don't have the <strong>{permission}</strong> permission required to view this page.
        Contact your administrator to request access.
      </p>
    </div>
  );
}

function PageContent({ page, onFeatureChange, featureOverrides }: {
  page: Page;
  onFeatureChange?: (key: string, enabled: boolean) => void;
  featureOverrides?: Record<string, boolean>;
}): ReactNode {
  const { can } = useDynamicAccess();
  const requiredPermission = PAGE_PERMISSIONS[page];
  if (requiredPermission !== undefined && !can(requiredPermission)) {
    return <AccessDenied permission={requiredPermission} />;
  }

  switch (page) {
    case 'dashboard': return <DashboardView />;
    case 'orders': return <OrdersView />;
    case 'reports': return <ReportsView />;
    case 'inventory': return <InventoryView />;
    case 'billing': return <BillingView />;
    case 'users': return <UsersView />;
    case 'audit-logs': return <AuditLogsView />;
    case 'account': return <AccountView />;
    case 'masters': return <MastersView />;
    case 'platform': return <PlatformView />;
    case 'jobs': return <JobsView />;
    case 'notifications': return <NotificationsView />;
    case 'rbac': return <RbacView />;
    case 'feature-flags': return <FeatureFlagsView />;
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
  const deepLink = useMemo(() => readAuthDeepLink(), []);
  const [authPage, setAuthPage] = useState<AuthPage>(deepLink.page);
  const [authToken, setAuthToken] = useState(deepLink.token);

  const goAuth = useCallback((next: AuthPage, token = '') => {
    setAuthPage(next);
    setAuthToken(token);
    if (next === 'login' || next === 'register' || next === 'forgot') {
      clearAuthQuery();
    }
  }, []);

  const navigate = useCallback((path: string) => {
    const key = path.replace('/', '') as Page;
    setPage(key);
  }, []);

  const handleFeatureChange = useCallback((key: string, enabled: boolean) => {
    if (key === 'offline') setOfflineEnabled(enabled);
  }, [setOfflineEnabled]);

  const featureOverrides = useMemo(() => ({ offline: offlineEnabled }), [offlineEnabled]);

  const isSuperadmin = session !== null && SUPERADMIN_ROLES.has(session.role);
  const { can: canDynamic, loading: accessLoading } = useDynamicAccess();
  const { isEnabled } = useFeatureFlags();

  const navConfig = useMemo<NavigationConfig>(() => {
    const items = NAV_ITEMS.filter((item) => {
      // Hide dev/admin-only pages from non-superadmins
      if (SUPERADMIN_ONLY_KEYS.has(item.key) && !isSuperadmin) return false;
      // If the item requires a permission, check it against the live RBAC snapshot
      if (item.permission !== undefined && !accessLoading) {
        if (!canDynamic(item.permission)) return false;
      }
      
      // Feature flag gating for modules (except core dev ones)
      if (!SUPERADMIN_ONLY_KEYS.has(item.key) && !isEnabled(`module.${item.key}`)) {
        return false;
      }

      return true;
    });
    return {
      items,
      activeKey: page,
      onNavigate: navigate,
      breadcrumbs: [
        { label: 'Home', path: '/dashboard' },
        { label: NAV_ITEMS.find((n) => n.key === page)?.label ?? page },
      ],
    };
  }, [page, navigate, isSuperadmin, canDynamic, accessLoading, isEnabled]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--maw-fgMuted)' }}>{t('common.loading')}</div>;
  if (session === null) {
    switch (authPage) {
      case 'register': return <RegisterForm client={client} onSwitchToLogin={() => goAuth('login')} onVerifyReady={() => goAuth('verify')} tenantId="demo-tenant" />;
      case 'forgot': return <ForgotPasswordForm client={client} onSwitchToLogin={() => goAuth('login')} onResetReady={() => goAuth('reset')} tenantId="demo-tenant" initialEmail={authToken} />;
      case 'reset': return <ResetPasswordForm client={client} onSwitchToLogin={() => goAuth('login')} initialToken={authToken} />;
      case 'verify': return <VerifyEmailForm client={client} onSwitchToLogin={() => goAuth('login')} initialToken={authToken} />;
      default: return (
        <LoginForm
          onSwitchToRegister={() => goAuth('register')}
          onSwitchToForgot={(email) => goAuth('forgot', email)}
          onSwitchToVerify={() => goAuth('verify')}
        />
      );
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
                <span style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)' }}>MAW Foundation Admin</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={brand.tenantId}
                  onChange={(e) => {
                    void switchTenant(e.target.value);
                    toast.success(`Brand: ${e.target.value}`);
                  }}
                  className="maw-btn-hover"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--maw-radius-pill)',
                    border: '1px solid color-mix(in srgb, var(--maw-brand) 50%, transparent)',
                    fontSize: 'var(--maw-text-xs)',
                    background: 'color-mix(in srgb, var(--maw-brand) 10%, transparent)',
                    color: 'var(--maw-brand)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    paddingRight: 24,
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
                  className="maw-btn-hover"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--maw-radius-pill)',
                    border: '1px solid var(--maw-border)',
                    fontSize: 'var(--maw-text-xs)',
                    background: 'var(--maw-surface)',
                    color: 'var(--maw-fg)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {availableLocales.map((l) => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: 1, height: 24, background: 'var(--maw-border)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  variant="ghost"
                  onClick={toggleColorMode}
                  style={{ padding: '6px', fontSize: 16, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Toggle Theme"
                >
                  {isDark ? '☀️' : '🌙'}
                </Button>
                <NetworkStatusBadge />
                <SyncStatusIndicator />
              </div>

              <div style={{ width: 1, height: 24, background: 'var(--maw-border)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 'var(--maw-text-xs)', fontWeight: 600, color: 'var(--maw-fg)' }}>
                    {session.userId}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--maw-brand)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    {session.role}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => void logout()}
                  style={{ padding: '6px 12px', fontSize: 'var(--maw-text-xs)', borderRadius: 'var(--maw-radius-pill)', color: 'var(--maw-danger)' }}
                >
                  Logout
                </Button>
              </div>
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
        <FeatureFlagProvider fetchFlags={async () => ({ 
          'advanced_reports': true,
          'module.dashboard': true,
          'module.orders': true,
          'module.reports': true,
          'module.inventory': true,
          'module.billing': true,
          'module.users': true,
          'module.audit-logs': true,
          'module.account': true,
          'module.masters': true
        })}>
          <OfflineProvider
            networkManager={offlineInfra.networkManager}
            syncEngine={offlineInfra.syncEngine}
            enabled={offlineEnabled}
          >
            <Shell offlineEnabled={offlineEnabled} setOfflineEnabled={setOfflineEnabled} />
          </OfflineProvider>
        </FeatureFlagProvider>
      </DynamicAccessProvider>
    </AuthProvider>
  );
}
