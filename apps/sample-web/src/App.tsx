import { useMemo, useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createConfigEngine, APP_CONFIG_DEFAULTS } from '@mawsoftwares/sdk/config/config-engine';
import { setDefaultPhoneRegion } from '@mawsoftwares/sdk/kernel/validate';
import { EXAMPLE_RBAC } from '@mawsoftwares/rbac-core';
import { storedDesignToOverrides, normalizeDesignMarkdown } from '@mawsoftwares/theme';
import {
  AuthProvider,
  composeProjectTheme,
  DynamicAccessProvider,
  useDynamicAccess,
  useUrlSyncedPage,
  pageFromPathname,
  type PagePathEntry,
  useAuth,
  NavigationProvider,
  AppShell,
  Sidebar,
  EmptyState,
  Breadcrumbs,
  useI18n,
  SidebarBrand,
  SidebarUser,
  Button,
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
import { LayoutStudioView } from './features/layout-studio';
import { SharedThemeContext } from './shared-theme';
import { appBaseTheme } from './app-theme';
import { PROJECT_UI_PREVIEW_EVENT, PROJECT_UI_PUBLISHED_EVENT, loadPublishedUi, readPreviewUi, stopPreviewUi, readCachedPublishedUi, resolvePublishedUi, writeCachedPublishedUi } from './layout-config';
import { projectThemeRegistry } from './project-themes';
import type { ProjectUiConfig, ResolvedProjectUi } from '@mawsoftwares/layout';
import type { ThemeOverrides } from '@mawsoftwares/theme';
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

type Page = 'dashboard' | 'orders' | 'reports' | 'inventory' | 'billing' | 'users' | 'rbac' | 'audit-logs' | 'showcase' | 'settings' | 'account' | 'feature-flags' | 'menus' | 'theme' | 'layout' | 'superadmin' | 'messaging' | 'storage' | 'storage-settings' | (string & {});

import { PagePathsProvider } from './page-paths';
import { ACTIVE_AUDIENCE, audienceBase } from './route-bases';

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
  { key: 'layout', label: 'Layout Studio', icon: 'layout-dashboard', path: '/layout', group: 'Admin', sortOrder: 8.5, permission: 'Read_Layout' },
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
  layout: 'Read_Layout',
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

function flattenNavItems(items: NavItem[]): PagePathEntry[] {
  return items.flatMap((i) => [{ key: i.key, path: i.path }, ...flattenNavItems(i.children ?? [])]);
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
    case 'layout': return <LayoutStudioView />;
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
  const { applyThemeOverrides, setColorMode, isDark } = useTheme();
  // The tenant's shared theme (Theme Designer). The project's published theme selection is layered over it below.
  const [sharedOverrides, setSharedOverrides] = useState<ThemeOverrides | undefined>(undefined);
  // End users render the PUBLISHED config only; Layout Studio edits a draft until it is published. The server is the
  // source of truth; the cached copy only avoids a flash of the classic shell while the request is in flight.
  const [liveUi, setLiveUi] = useState<ResolvedProjectUi | null>(null);
  // A not-yet-published config the signed-in author is previewing (this tab only). It wins over the live one while set.
  const [previewUi, setPreviewUi] = useState<ResolvedProjectUi | null>(() => {
    const stored = readPreviewUi();
    return stored === null ? null : resolvePublishedUi(stored);
  });
  useEffect(() => {
    const onPreview = (event: Event): void => {
      const config = (event as CustomEvent<ProjectUiConfig | null>).detail;
      setPreviewUi(config === null ? null : resolvePublishedUi(config));
    };
    window.addEventListener(PROJECT_UI_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(PROJECT_UI_PREVIEW_EVENT, onPreview);
  }, []);
  const tenantId = session?.tenantId;
  useEffect(() => {
    if (tenantId === undefined) {
      setLiveUi(null);
      return;
    }
    let cancelled = false;
    setLiveUi(resolvePublishedUi(readCachedPublishedUi(tenantId)));
    const refresh = (): void => {
      loadPublishedUi().then(
        (published) => {
          if (cancelled) return;
          writeCachedPublishedUi(tenantId, published);
          setLiveUi(resolvePublishedUi(published));
        },
        () => undefined, // offline / request failed: keep what is applied
      );
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener(PROJECT_UI_PUBLISHED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      window.removeEventListener(PROJECT_UI_PUBLISHED_EVENT, refresh);
    };
  }, [tenantId]);

  // Theme = shared theme + the project's published selection. Nothing is applied until something is configured, so
  // an app with no layout config renders exactly as before.
  const effectiveUi = session === null ? liveUi : (previewUi ?? liveUi);
  const baseThemeFor = useCallback((themeId: string | null) => appBaseTheme(sharedOverrides, themeId, projectThemeRegistry), [sharedOverrides]);
  const themeTouched = useRef(false);
  useEffect(() => {
    const composed = composeProjectTheme(baseThemeFor(effectiveUi?.theme.themeId ?? null), effectiveUi?.theme, projectThemeRegistry);
    if (composed === undefined && !themeTouched.current) return;
    themeTouched.current = true;
    applyThemeOverrides(composed ?? {});
  }, [baseThemeFor, effectiveUi, applyThemeOverrides]);

  // The published colour mode is a project default: a user's own light/dark choice always wins.
  const publishedColorMode = effectiveUi?.theme.colorMode;
  useEffect(() => {
    if (publishedColorMode === undefined || publishedColorMode === 'system') return;
    try {
      if (window.localStorage.getItem('maw-color-mode') !== null) return;
    } catch {
      // storage unavailable: apply the project default
    }
    setColorMode(publishedColorMode);
    // setColorMode persists the mode as if the user had chosen it, which would make the project default sticky.
    // Undo that: only a user's own toggle may write the key.
    try {
      window.localStorage.removeItem('maw-color-mode');
    } catch {
      // storage unavailable: nothing was persisted
    }
  }, [publishedColorMode, setColorMode]);
  const [navTree, setNavTree] = useState<MenuTreeNode[]>([]);
  const [menuTree, setMenuTree] = useState<MenuTreeNode[] | null>(null);
  const [dynamicNavItems, setDynamicNavItems] = useState<NavItem[] | null>(null);
  const urlBase = audienceBase(ACTIVE_AUDIENCE, import.meta.env.BASE_URL);
  const pagePaths = useMemo<PagePathEntry[]>(
    () => (menuTree !== null ? flattenMenuTree(menuTree) : flattenNavItems(NAV_ITEMS)),
    [menuTree],
  );
  const [page, setPage] = useState<Page>(() => pageFromPathname(window.location.pathname, urlBase, []));

  useEffect(() => {
    const stored = localStorage.getItem(DESIGN_MD_STORAGE_KEY);
    if (stored === null) return;
    try {
      const overrides = storedDesignToOverrides(JSON.parse(stored) as unknown);
      if (overrides !== null) setSharedOverrides(overrides);
      else localStorage.removeItem(DESIGN_MD_STORAGE_KEY);
    } catch {
      localStorage.removeItem(DESIGN_MD_STORAGE_KEY);
    }
  }, []);

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
        setSharedOverrides(normalized.overrides);
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

  const navigate = useCallback((path: string) => {
    setPage(findMenuKeyByPath(navTree, path) as Page);
  }, [navTree]);

  useUrlSyncedPage({
    page, setPage: setPage as (p: string) => void, entries: pagePaths, base: urlBase, enabled: session !== null,
  });

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
    <SharedThemeContext.Provider value={baseThemeFor}>
    <NavigationProvider config={navConfig}>
      <AppShell
        layout={effectiveUi === null || effectiveUi.layout.source === 'default' ? undefined : effectiveUi.layout}
        sidebar={
          <Sidebar
            header={(collapsed) => <SidebarBrand collapsed={collapsed} title="MAW Foundation" subtitle="Admin Console" />}
            footer={(collapsed) => <SidebarUser collapsed={collapsed} name={session.userId} role={session.role} />}
          />
        }
        header={<Breadcrumbs />}
        actions={<TopBarActions />}
      >
        <OfflineBanner style={{ marginBottom: 'var(--maw-space-md)' }} />
        <PagePathsProvider base={urlBase} entries={pagePaths}>
          <PageContent page={page} onFeatureChange={handleFeatureChange} featureOverrides={featureOverrides} />
        </PagePathsProvider>
      </AppShell>
      {previewUi !== null && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--maw-space-md)',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: 'var(--maw-space-sm) var(--maw-space-md)',
            borderRadius: 24,
            background: 'var(--maw-surface)',
            color: 'var(--maw-fg)',
            border: '1px solid var(--maw-border)',
            boxShadow: '0 8px 24px rgb(0 0 0 / 0.2)',
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          <span style={{ fontSize: 'var(--maw-text-sm)' }}>Previewing an unpublished layout — only you see this.</span>
          <div role="group" aria-label="Colour mode" style={{ display: 'flex', gap: 'var(--maw-space-xs)' }}>
            {(['light', 'dark'] as const).map((mode) => (
              <Button key={mode} variant={isDark === (mode === 'dark') ? 'primary' : 'outline'} aria-pressed={isDark === (mode === 'dark')} onClick={() => setColorMode(mode)}>
                {mode === 'light' ? 'Light' : 'Dark'}
              </Button>
            ))}
          </div>
          <Button onClick={() => setPage('layout')}>Back to Studio</Button>
          <Button variant="outline" onClick={stopPreviewUi}>Exit preview</Button>
        </div>
      )}
    </NavigationProvider>
    </SharedThemeContext.Provider>
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
