import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createConfigEngine, APP_CONFIG_DEFAULTS } from '@mawsoftwares/sdk/config/config-engine';
import { setDefaultPhoneRegion } from '@mawsoftwares/sdk/kernel/validate';
import { EXAMPLE_RBAC } from '@mawsoftwares/rbac-core';
import { storedDesignToOverrides, normalizeDesignMarkdown } from '@mawsoftwares/theme';
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
  useTheme,
  type NavItem,
  type NavigationConfig,
} from '@mawsoftwares/ui-web';
import { client, sharedTheme } from './api';
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
import { RbacView } from './features/rbac';
import { FeatureFlagsView } from './features/feature-flags';
import { MenusView } from './features/menus';
import { ThemeSettingsView, DESIGN_MD_STORAGE_KEY, DESIGN_MD_CONTENT_STORAGE_KEY } from './features/theme-settings';
import { SuperAdminView } from './features/superadmin';
import { MessagingView } from './features/messaging';
import { loadMenuTree, type MenuTreeNode } from './menu-tree';
import { buildPageBreadcrumbs, sidebarActiveKey } from './nav-breadcrumbs';
import { TopBarActions } from './shell/TopBarActions';
import { AppConfigProvider } from './config-context';

const config = createConfigEngine();
config.loadLayer('app', {
  ...(APP_CONFIG_DEFAULTS as unknown as Record<string, unknown>),
  offline: { enabled: true },
  phoneRegion: 'IN',
});
setDefaultPhoneRegion(config.getString('phoneRegion', 'IN') ?? 'IN');
const offlineInfra = setupOffline(config, client, 'demo-tenant');

type Page = 'dashboard' | 'orders' | 'reports' | 'inventory' | 'billing' | 'users' | 'rbac' | 'audit-logs' | 'showcase' | 'settings' | 'account' | 'feature-flags' | 'menus' | 'theme' | 'superadmin' | 'messaging';

type AuthPage = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

const SUPERADMIN_ROLES = new Set(['super_admin']); // top of the role ladder only

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', path: '/dashboard', group: 'Main', sortOrder: 0 },
  { key: 'orders', label: 'Orders', icon: 'shopping-cart', path: '/orders', group: 'Main', sortOrder: 1, permission: 'Read_Orders' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart', path: '/reports', group: 'Main', sortOrder: 2, permission: 'Read_Reports' },
  { key: 'inventory', label: 'Inventory', icon: 'clipboard-list', path: '/inventory', group: 'Main', sortOrder: 3, permission: 'Read_Inventory' },
  { key: 'billing', label: 'Billing', icon: 'credit-card', path: '/billing', group: 'Finance', sortOrder: 4, permission: 'Read_Billing' },
  { key: 'users', label: 'Users', icon: 'users', path: '/users', group: 'Admin', sortOrder: 5, permission: 'Read_Users' },
  { key: 'account', label: 'Account', icon: 'lock', path: '/account', group: 'Admin', sortOrder: 7 },
  { key: 'superadmin', label: 'Super Admin', icon: 'shield', path: '/superadmin', group: 'Admin', sortOrder: 8.4 },
  { key: 'customers', label: 'Customers', icon: 'list', path: '/customers', group: 'Main', sortOrder: 8, permission: 'Read_Customers' },
];

const PAGE_PERMISSIONS: Partial<Record<Page, string>> = {
  orders: 'Read_Orders',
  reports: 'Read_Reports',
  inventory: 'Read_Inventory',
  billing: 'Read_Billing',
  users: 'Read_Users',
  'audit-logs': 'Read_AuditLogs',
  rbac: 'Manage_Rbac',
  'feature-flags': 'Read_FeatureFlags',
  menus: 'Manage_Menus',
  theme: 'Manage_Theme',
  messaging: 'Read_Messaging',
};

const SUPERADMIN_ONLY_KEYS = new Set(['superadmin', 'settings']);

const NAV_GROUPS: Record<string, string> = {
  dashboard: 'Main', orders: 'Main', reports: 'Main', inventory: 'Main',
  billing: 'Finance',
  users: 'Admin', 'audit-logs': 'Admin', account: 'Admin',
  superadmin: 'Admin', settings: 'Admin',
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
    case 'rbac': return <RbacView />;
    case 'feature-flags': return <FeatureFlagsView />;
    case 'menus': return <MenusView />;
    case 'theme': return <ThemeSettingsView />;
    case 'messaging': return <MessagingView />;
    case 'settings': return <SettingsView onFeatureChange={onFeatureChange} featureOverrides={featureOverrides} />;
    case 'showcase': return <ShowcaseView />;
    case 'superadmin': return <SuperAdminView />;
  }
}

function Shell({ offlineEnabled, setOfflineEnabled }: {
  offlineEnabled: boolean;
  setOfflineEnabled: (v: boolean) => void;
}): ReactNode {
  const { session, loading } = useAuth();
  const { t } = useI18n();
  const { applyThemeOverrides } = useTheme();
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    const stored = localStorage.getItem(DESIGN_MD_STORAGE_KEY);
    if (stored === null) return;
    try {
      const overrides = storedDesignToOverrides(JSON.parse(stored) as unknown);
      if (overrides !== null) applyThemeOverrides(overrides);
      else localStorage.removeItem(DESIGN_MD_STORAGE_KEY);
    } catch {
      localStorage.removeItem(DESIGN_MD_STORAGE_KEY);
    }
  }, [applyThemeOverrides]);

  // The theme is application-wide: once signed in, load the shared one from the server (and re-check when the window
  // regains focus), so a change made by an admin reaches everyone. The localStorage copy above is only a first-paint cache.
  useEffect(() => {
    if (session === null) return undefined;
    let cancelled = false;
    const syncSharedTheme = async (): Promise<void> => {
      try {
        const designMd = await sharedTheme.load();
        if (cancelled) return;
        if (designMd === null) {
          // An admin reset the theme: drop our cached copy and reload once into the default.
          if (localStorage.getItem(DESIGN_MD_STORAGE_KEY) !== null) {
            localStorage.removeItem(DESIGN_MD_STORAGE_KEY);
            localStorage.removeItem(DESIGN_MD_CONTENT_STORAGE_KEY);
            window.location.reload();
          }
          return;
        }
        const normalized = normalizeDesignMarkdown(designMd);
        if (normalized.recognized.length === 0) return;
        applyThemeOverrides(normalized.overrides);
        localStorage.setItem(DESIGN_MD_STORAGE_KEY, JSON.stringify(normalized.overrides));
        localStorage.setItem(DESIGN_MD_CONTENT_STORAGE_KEY, normalized.canonical);
      } catch {
        // Offline or the request failed: keep whatever is already applied.
      }
    };
    void syncSharedTheme();
    window.addEventListener('focus', syncSharedTheme);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', syncSharedTheme);
    };
  }, [session, applyThemeOverrides]);

  const [authPage, setAuthPage] = useState<AuthPage>('login');

  const goAuth = useCallback((next: AuthPage) => {
    setAuthPage(next);
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

  const [dynamicNavItems, setDynamicNavItems] = useState<NavItem[] | null>(null);
  const [menuTree, setMenuTree] = useState<MenuTreeNode[] | null>(null);
  useEffect(() => {
    if (session === null) return;
    let cancelled = false;
    loadMenuTree()
      .then((tree) => {
        if (cancelled) return;
        setMenuTree(tree);
        const roots = tree.map(menuNodeToNavItem);
        setDynamicNavItems(roots.length > 0 ? roots : null);
      })
      .catch(() => {
        if (!cancelled) {
          setMenuTree(null);
          setDynamicNavItems(null);
        }
      });
    return () => { cancelled = true; };
  }, [session]);

  const allNavItems = dynamicNavItems ?? NAV_ITEMS;

  const navConfig = useMemo<NavigationConfig>(() => {
    const items = allNavItems.filter((item) => {
      if (SUPERADMIN_ONLY_KEYS.has(item.key) && !isSuperadmin) return false;
      if (item.permission !== undefined && !accessLoading) {
        if (!canDynamic(item.permission)) return false;
      }
      if (!SUPERADMIN_ONLY_KEYS.has(item.key) && !isEnabled(`module.${item.key}`)) {
        return false;
      }
      return true;
    });
    return {
      items,
      activeKey: sidebarActiveKey(page, items),
      onNavigate: navigate,
      breadcrumbs: buildPageBreadcrumbs(page, allNavItems, menuTree),
    };
  }, [page, navigate, isSuperadmin, canDynamic, accessLoading, isEnabled, allNavItems, menuTree]);

  if (loading) return <div className="maw-auth-screen">{t('common.loading')}</div>;
  if (session === null) {
    switch (authPage) {
      case 'register': return <RegisterForm client={client} onSwitchToLogin={() => goAuth('login')} onVerifyReady={() => goAuth('verify')} tenantId="demo-tenant" />;
      case 'forgot': return <ForgotPasswordForm client={client} onSwitchToLogin={() => goAuth('login')} onResetReady={() => goAuth('reset')} tenantId="demo-tenant" />;
      case 'reset': return <ResetPasswordForm client={client} onSwitchToLogin={() => goAuth('login')} />;
      case 'verify': return <VerifyEmailForm client={client} onSwitchToLogin={() => goAuth('login')} />;
      default: return (
        <LoginForm
          onSwitchToRegister={() => goAuth('register')}
          onSwitchToForgot={() => goAuth('forgot')}
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
            title="MAW Foundation Desktop"
            footer={(collapsed) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, justifyContent: collapsed ? 'center' : undefined, width: '100%' }}>
                <Avatar name={session.userId} size={28} />
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-shell-fg-muted, var(--maw-fgMuted))' }}>
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
    <AppConfigProvider>
      <AuthProvider client={client} rbac={rbac} restore={restoreSession}>
      <DynamicAccessProvider load={loadDynamicAccess}>
        <FeatureFlagProvider fetchFlags={async () => ({
          'advanced_reports': true,
          'module.dashboard': true,
          'module.users': true,
          'module.audit-logs': true,
          'module.account': true,
          'module.rbac': true,
          'module.menus': true,
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
    </AppConfigProvider>
  );
}
