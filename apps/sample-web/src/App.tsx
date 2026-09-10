import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createConfigEngine } from '@mawsoftwares/sdk/config/config-engine';
import { EXAMPLE_RBAC } from '@mawsoftwares/rbac-core';
import {
  AuthProvider,
  DynamicAccessProvider,
  useDynamicAccess,
  useAuth,
  NavigationProvider,
  AppShell,
  Sidebar,
  Breadcrumbs,
  useI18n,
  Avatar,
  Icon,
  OfflineProvider,
  OfflineBanner,
  FeatureFlagProvider,
  useFeatureFlags,
  type NavItem,
  type NavigationConfig,
} from '@mawsoftwares/ui-web';
import { client } from './api';
import { loadDynamicAccess, restoreSession } from './session';
import { setupOffline } from './offline-setup';
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
import { MenusView } from './features/menus';
import { loadMenuTree, flattenMenuTree, type MenuTreeNode } from './menu-tree';
import { TopBarActions } from './shell/TopBarActions';


// Offline infrastructure — created once; enabled/disabled via Settings toggle
const config = createConfigEngine();
config.loadLayer('app', { offline: { enabled: true } });
const offlineInfra = setupOffline(config, client, 'demo-tenant');

type Page = 'dashboard' | 'orders' | 'reports' | 'inventory' | 'billing' | 'users' | 'rbac' | 'audit-logs' | 'showcase' | 'settings' | 'account' | 'masters' | 'platform' | 'jobs' | 'notifications' | 'feature-flags' | 'menus';

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
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', path: '/dashboard', group: 'Main', sortOrder: 0 },
  { key: 'orders', label: 'Orders', icon: 'shopping-cart', path: '/orders', group: 'Main', sortOrder: 1, permission: 'Read_Orders' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart', path: '/reports', group: 'Main', sortOrder: 2, permission: 'Read_Reports' },
  { key: 'inventory', label: 'Inventory', icon: 'clipboard-list', path: '/inventory', group: 'Main', sortOrder: 3, permission: 'Read_Inventory' },
  { key: 'billing', label: 'Billing', icon: 'credit-card', path: '/billing', group: 'Finance', sortOrder: 4, permission: 'Read_Billing' },
  { key: 'users', label: 'Users', icon: 'users', path: '/users', group: 'Admin', sortOrder: 5, permission: 'Read_Users' },
  { key: 'audit-logs', label: 'Audit Logs', icon: 'scroll-text', path: '/audit-logs', group: 'Admin', sortOrder: 6, permission: 'Read_AuditLogs' },
  { key: 'account', label: 'Account', icon: 'lock', path: '/account', group: 'Admin', sortOrder: 7 },
  { key: 'masters', label: 'Master Data', icon: 'database', path: '/masters', group: 'Admin', sortOrder: 8, permission: 'Master_View' },
  { key: 'rbac', label: 'RBAC Admin', icon: 'key', path: '/rbac', group: 'Admin', sortOrder: 8.5, permission: 'Manage_Rbac' },
  { key: 'feature-flags', label: 'Feature Flags', icon: 'flag', path: '/feature-flags', group: 'Admin', sortOrder: 8.6, permission: 'Read_FeatureFlags' },
  { key: 'menus', label: 'Menu Management', icon: 'menu', path: '/menus', group: 'Admin', sortOrder: 8.7, permission: 'Manage_Menus' },
  { key: 'settings', label: 'Settings', icon: 'settings', path: '/settings', group: 'Admin', sortOrder: 9 },
  { key: 'platform', label: 'Platform', icon: 'puzzle', path: '/platform', group: 'Dev', sortOrder: 95 },
  { key: 'jobs', label: 'Jobs', icon: 'clock', path: '/jobs', group: 'Dev', sortOrder: 96 },
  { key: 'notifications', label: 'Notifications', icon: 'bell', path: '/notifications', group: 'Dev', sortOrder: 97 },
  { key: 'showcase', label: 'UI Showcase', icon: 'palette', path: '/showcase', group: 'Dev', sortOrder: 99 },
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
  rbac: 'Manage_Rbac',
  menus: 'Manage_Menus',
};

const SUPERADMIN_ONLY_KEYS = new Set(['settings', 'showcase', 'platform', 'jobs', 'notifications']);

/** Sidebar section for each known nav key, used to group DB-driven menu items the same way the static fallback does. */
const NAV_GROUPS: Record<string, string> = {
  dashboard: 'Main', orders: 'Main', reports: 'Main', inventory: 'Main',
  billing: 'Finance',
  users: 'Admin', 'audit-logs': 'Admin', account: 'Admin', masters: 'Admin',
  rbac: 'Admin', 'feature-flags': 'Admin', menus: 'Admin', settings: 'Admin',
  platform: 'Dev', jobs: 'Dev', notifications: 'Dev', showcase: 'Dev',
};

function menuNodeToNavItem(node: MenuTreeNode): NavItem {
  return {
    key: node.key,
    label: node.label,
    icon: node.icon ?? 'circle',
    path: node.path ?? `/${node.key}`,
    group: NAV_GROUPS[node.key],
    sortOrder: node.sortOrder,
    permission: node.permission ?? undefined,
  };
}

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
    case 'menus': return <MenusView />;
    case 'settings': return <SettingsView onFeatureChange={onFeatureChange} featureOverrides={featureOverrides} />;
    case 'showcase': return <ShowcaseView />;
  }
}


function Shell({ offlineEnabled, setOfflineEnabled }: {
  offlineEnabled: boolean;
  setOfflineEnabled: (v: boolean) => void;
}): ReactNode {
  const { session, loading } = useAuth();
  const { t } = useI18n();
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

  // Menu Management drives the real nav tree from the DB (see /menus admin page);
  // fall back to the static NAV_ITEMS list (still kept in sync as a reference/offline
  // fallback) if the fetch hasn't completed yet or fails, so the sidebar is never empty.
  const [dynamicNavItems, setDynamicNavItems] = useState<NavItem[] | null>(null);
  useEffect(() => {
    if (session === null) return;
    let cancelled = false;
    loadMenuTree()
      .then((tree) => {
        if (cancelled) return;
        const flat = flattenMenuTree(tree).map(menuNodeToNavItem);
        setDynamicNavItems(flat.length > 0 ? flat : null);
      })
      .catch(() => {
        if (!cancelled) setDynamicNavItems(null);
      });
    return () => { cancelled = true; };
  }, [session]);

  const allNavItems = dynamicNavItems ?? NAV_ITEMS;

  const navConfig = useMemo<NavigationConfig>(() => {
    const items = allNavItems.filter((item) => {
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
        { label: allNavItems.find((n) => n.key === page)?.label ?? page },
      ],
    };
  }, [page, navigate, isSuperadmin, canDynamic, accessLoading, isEnabled, allNavItems]);

  if (loading) return <div className="maw-auth-screen">{t('common.loading')}</div>;
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
            logo={<Icon name="zap" size={22} />}
            title="MAW Foundation Admin"
            footer={(collapsed) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, justifyContent: collapsed ? 'center' : undefined, width: '100%' }}>
                <Avatar name={session.userId} size={28} />
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
                    {session.userId}
                  </div>
                )}
              </div>
            )}
          />
        }
        header={<Breadcrumbs />}
        actions={<TopBarActions />}
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
          // 'module.orders': true,
          // 'module.reports': true,
          // 'module.inventory': true,
          // 'module.billing': true,
          'module.users': true,
          'module.audit-logs': true,
          'module.account': true,
          'module.masters': true,
          'module.rbac': true,
          'module.menus': true
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
