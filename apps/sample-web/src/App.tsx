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
  EmptyState,
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
import { StorageView } from './features/storage-page';
import { StorageSettingsView } from './features/storage-settings';
// @scaffold:imports
import { loadMenuTree, flattenMenuTree, findMenuKeyByPath, MENUS_CHANGED_EVENT, type MenuTreeNode } from './menu-tree';
import { buildPageBreadcrumbs, sidebarActiveKey } from './nav-breadcrumbs';
import { TopBarActions } from './shell/TopBarActions';
import { AppConfigProvider } from './config-context';


// Offline infrastructure — created once; enabled/disabled via Settings toggle
const config = createConfigEngine();
config.loadLayer('app', {
  ...(APP_CONFIG_DEFAULTS as unknown as Record<string, unknown>),
  offline: { enabled: true },
  phoneRegion: 'IN',
});
setDefaultPhoneRegion(config.getString('phoneRegion', 'IN') ?? 'IN');
const offlineInfra = setupOffline(config, client, 'demo-tenant');

type Page = 'dashboard' | 'orders' | 'reports' | 'inventory' | 'billing' | 'users' | 'rbac' | 'audit-logs' | 'showcase' | 'settings' | 'account' | 'feature-flags' | 'menus' | 'theme' | 'superadmin' | 'messaging' | 'storage' | 'storage-settings' | (string & {});

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

const SUPERADMIN_ROLES = new Set(['super_admin']); // top of the role ladder only

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', path: '/dashboard', group: 'Main', sortOrder: 0 },
  { key: 'orders', label: 'Orders', icon: 'shopping-cart', path: '/orders', group: 'Main', sortOrder: 1, permission: 'Read_Orders' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart', path: '/reports', group: 'Main', sortOrder: 2, permission: 'Read_Reports' },
  { key: 'inventory', label: 'Inventory', icon: 'clipboard-list', path: '/inventory', group: 'Main', sortOrder: 3, permission: 'Read_Inventory' },
  { key: 'billing', label: 'Billing', icon: 'credit-card', path: '/billing', group: 'Finance', sortOrder: 4, permission: 'Read_Billing' },
  { key: 'storage', label: 'Files', icon: 'folder', path: '/storage', group: 'Main', sortOrder: 3.5, permission: 'Read_Storage' },
  { key: 'users', label: 'Users', icon: 'users', path: '/users', group: 'Admin', sortOrder: 5, permission: 'Read_Users' },
  { key: 'account', label: 'Account', icon: 'lock', path: '/account', group: 'Admin', sortOrder: 7 },
  { key: 'superadmin', label: 'Super Admin', icon: 'shield', path: '/superadmin', group: 'Admin', sortOrder: 8.4 },
  { key: 'customers', label: 'Customers', icon: 'list', path: '/customers', group: 'Main', sortOrder: 8, permission: 'Read_Customers' },
  // @scaffold:nav
];

/** Maps a page key to the permission required to view it. */
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
  storage: 'Read_Storage',
  'storage-settings': 'Manage_StorageConfiguration',
  // @scaffold:permissions
};

const SUPERADMIN_ONLY_KEYS = new Set(['superadmin', 'settings']);

/** Sidebar section for each known nav key, used to group DB-driven menu items the same way the static fallback does. */
const NAV_GROUPS: Record<string, string> = {
  dashboard: 'Main', orders: 'Main', reports: 'Main', inventory: 'Main', storage: 'Main',
  billing: 'Finance',
  users: 'Admin', 'audit-logs': 'Admin', account: 'Admin',
  superadmin: 'Admin', settings: 'Admin',
};

/** Hub nodes whose children are shown as cards on their own page, not as nested sidebar entries. */
const HUB_KEYS = new Set(['superadmin']);

function menuNodeToNavItem(node: MenuTreeNode): NavItem {
  const children = HUB_KEYS.has(node.key) ? [] : node.children.map(menuNodeToNavItem);
  return {
    key: node.key,
    label: node.label,
    icon: node.icon ?? 'circle',
    path: node.path ?? (children.length > 0 ? '' : `/${node.key}`),
    group: NAV_GROUPS[node.key],
    sortOrder: node.sortOrder,
    permission: node.permission ?? undefined,
    children: children.length > 0 ? children : undefined,
  };
}

/** Keys of the built-in modules, which stay gated by the `module.<key>` feature flag. */
const KNOWN_MODULE_KEYS = new Set(NAV_ITEMS.map((i) => i.key));

/** Recursively keeps only the nav items `visible` allows; a path-less parent with no visible children is dropped. */
function pruneNav(items: NavItem[], visible: (item: NavItem) => boolean): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (!visible(item)) continue;
    const children = item.children ? pruneNav(item.children, visible) : undefined;
    if (item.path === '' && (children === undefined || children.length === 0)) continue;
    out.push({ ...item, children: children && children.length > 0 ? children : undefined });
  }
  return out;
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
    case 'storage': return <StorageView />;
    case 'storage-settings': return <StorageSettingsView />;
    case 'settings': return <SettingsView onFeatureChange={onFeatureChange} featureOverrides={featureOverrides} />;
    case 'showcase': return <ShowcaseView />;
    case 'superadmin': return <SuperAdminView />;
    // @scaffold:pages
    default: return <EmptyState title="Page not available" message="This menu item has no page in this app yet." />;
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

  // The theme is application-wide: load the shared one from the server (and re-check when the window regains focus),
  // so a change made by an admin reaches everyone. Signed in -> the authenticated read; signed out (the login page)
  // -> the public read, so even a first-time visitor sees the real theme. The localStorage copy above is only a
  // first-paint cache.
  const signedIn = session !== null;
  useEffect(() => {
    let cancelled = false;
    const syncSharedTheme = async (): Promise<void> => {
      try {
        const designMd = await (signedIn ? sharedTheme.load() : sharedTheme.loadPublic());
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
  }, [signedIn, applyThemeOverrides]);
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

  const [navTree, setNavTree] = useState<MenuTreeNode[]>([]);
  const navigate = useCallback((path: string) => {
    setPage(findMenuKeyByPath(navTree, path) as Page);
  }, [navTree]);

  const handleFeatureChange = useCallback((key: string, enabled: boolean) => {
    if (key === 'offline') setOfflineEnabled(enabled);
  }, [setOfflineEnabled]);

  const featureOverrides = useMemo(() => ({ offline: offlineEnabled }), [offlineEnabled]);

  const isSuperadmin = session !== null && SUPERADMIN_ROLES.has(session.role);
  const { can: canDynamic, loading: accessLoading, reload: reloadAccess } = useDynamicAccess();
  const { isEnabled } = useFeatureFlags();

  // Menu Management drives the real nav tree from the DB (see /menus admin page);
  // fall back to the static NAV_ITEMS list (still kept in sync as a reference/offline
  // fallback) if the fetch hasn't completed yet or fails, so the sidebar is never empty.
  const [dynamicNavItems, setDynamicNavItems] = useState<NavItem[] | null>(null);
  const [menuTree, setMenuTree] = useState<MenuTreeNode[] | null>(null);
  const [menuVersion, setMenuVersion] = useState(0);
  useEffect(() => {
    // A menu change can also grant a permission, so refresh the permission snapshot along with the tree.
    const bump = () => {
      void reloadAccess();
      setMenuVersion((v) => v + 1);
    };
    window.addEventListener(MENUS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(MENUS_CHANGED_EVENT, bump);
  }, [reloadAccess]);
  useEffect(() => {
    if (session === null) return;
    let cancelled = false;
    loadMenuTree()
      .then((tree) => {
        if (cancelled) return;
        setMenuTree(tree);
        setNavTree(tree);
        // Only root items become sidebar entries — a node with children (e.g. "Super
        // Admin") is a hub whose sub-pages are reached via cards on its own page,
        // not a nested sidebar submenu.
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
  }, [session, menuVersion]);

  const allNavItems = dynamicNavItems ?? NAV_ITEMS;

  const navConfig = useMemo<NavigationConfig>(() => {
    const flagByKey = new Map(flattenMenuTree(menuTree ?? []).map((n) => [n.key, n.featureFlag]));
    const items = pruneNav(allNavItems, (item) => {
      // Hide dev/admin-only pages from non-superadmins
      if (SUPERADMIN_ONLY_KEYS.has(item.key) && !isSuperadmin) return false;
      // If the item requires a permission, check it against the live RBAC snapshot
      if (item.permission !== undefined && !accessLoading) {
        if (!canDynamic(item.permission)) return false;
      }
      if (SUPERADMIN_ONLY_KEYS.has(item.key)) return true;
      // Built-in modules: gated by `module.<key>`. Menus created in Menu Management: gated only by their own optional feature flag.
      if (KNOWN_MODULE_KEYS.has(item.key)) return isEnabled(`module.${item.key}`);
      const flag = flagByKey.get(item.key);
      return flag ? isEnabled(flag) : true;
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
          // 'module.orders': true,
          // 'module.reports': true,
          'module.inventory': true,
          // 'module.billing': true,
          'module.users': true,
          'module.storage': true,
          'module.audit-logs': true,
          'module.account': true,
          'module.customers': true,
          'module.customer': true,

          'module.rbac': true,
          'module.menus': true,
          // @scaffold:flags
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
