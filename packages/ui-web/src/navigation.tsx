import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { Button, Badge } from './components';
import { IconButton, Stack } from './ui-kit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavItem {
  key: string;
  label: string;
  icon?: string;
  path: string;
  permission?: string;
  badge?: string | number;
  children?: NavItem[];
  sortOrder?: number;
  group?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface NavigationConfig {
  items: NavItem[];
  activeKey: string;
  onNavigate: (path: string) => void;
  breadcrumbs?: BreadcrumbItem[];
}

// ---------------------------------------------------------------------------
// NavigationContext
// ---------------------------------------------------------------------------

interface NavigationContextValue {
  items: NavItem[];
  activeKey: string;
  collapsed: boolean;
  breadcrumbs: BreadcrumbItem[];
  navigate: (path: string) => void;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
  registerItems: (items: NavItem[]) => void;
  unregisterItems: (keys: string[]) => void;
  setBreadcrumbs: (crumbs: BreadcrumbItem[]) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  config,
  defaultCollapsed = false,
  children,
}: {
  config: NavigationConfig;
  defaultCollapsed?: boolean;
  children: ReactNode;
}): ReactNode {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [dynamicItems, setDynamicItems] = useState<NavItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(config.breadcrumbs ?? []);

  useEffect(() => {
    if (config.breadcrumbs !== undefined) setBreadcrumbs(config.breadcrumbs);
  }, [config.breadcrumbs]);

  const allItems = useMemo(() => {
    const merged = [...config.items, ...dynamicItems];
    return merged.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [config.items, dynamicItems]);

  const registerItems = useCallback((items: NavItem[]) => {
    setDynamicItems((prev) => {
      const keys = new Set(items.map((i) => i.key));
      return [...prev.filter((p) => !keys.has(p.key)), ...items];
    });
  }, []);

  const unregisterItems = useCallback((keys: string[]) => {
    const keySet = new Set(keys);
    setDynamicItems((prev) => prev.filter((p) => !keySet.has(p.key)));
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({
      items: allItems,
      activeKey: config.activeKey,
      collapsed,
      breadcrumbs,
      navigate: config.onNavigate,
      toggleSidebar: () => setCollapsed((c) => !c),
      setCollapsed,
      registerItems,
      unregisterItems,
      setBreadcrumbs,
    }),
    [allItems, config.activeKey, config.onNavigate, collapsed, breadcrumbs, registerItems, unregisterItems],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (ctx === null) throw new Error('useNavigation must be used within <NavigationProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

export function Sidebar({
  header,
  footer,
  style,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  const { items, activeKey, collapsed, navigate, toggleSidebar } = useNavigation();

  const grouped = useMemo(() => {
    const groups = new Map<string, NavItem[]>();
    for (const item of items) {
      const g = item.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    return groups;
  }, [items]);

  return (
    <aside
      style={{
        ...base,
        width: collapsed ? 64 : 260,
        minHeight: '100vh',
        background: 'var(--maw-bgMuted)',
        borderRight: '1px solid var(--maw-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {header !== undefined && (
        <div style={{ padding: collapsed ? 'var(--maw-space-md)' : 'var(--maw-space-lg)', borderBottom: '1px solid var(--maw-border)' }}>
          {header}
        </div>
      )}

      <div style={{ padding: 'var(--maw-space-sm)', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
        <IconButton label={collapsed ? 'Expand' : 'Collapse'} onClick={toggleSidebar}>
          {collapsed ? '→' : '←'}
        </IconButton>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--maw-space-xs)' }}>
        {Array.from(grouped.entries()).map(([group, groupItems]) => (
          <div key={group}>
            {group !== '' && !collapsed && (
              <div style={{ padding: '8px 12px 4px', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {group}
              </div>
            )}
            {groupItems.map((item) => (
              <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={collapsed} onNavigate={navigate} />
            ))}
          </div>
        ))}
      </nav>

      {footer !== undefined && (
        <div style={{ padding: collapsed ? 'var(--maw-space-md)' : 'var(--maw-space-lg)', borderTop: '1px solid var(--maw-border)' }}>
          {footer}
        </div>
      )}
    </aside>
  );
}

function SidebarItem({
  item,
  active,
  collapsed,
  onNavigate,
  depth = 0,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: (path: string) => void;
  depth?: number;
}): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children !== undefined && item.children.length > 0;

  return (
    <>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          else onNavigate(item.path);
        }}
        title={collapsed ? item.label : undefined}
        style={{
          ...base,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: collapsed ? '8px' : `8px 12px 8px ${12 + depth * 16}px`,
          border: 'none',
          borderRadius: 'var(--maw-radius-md)',
          background: active ? 'var(--maw-brand)' : 'transparent',
          color: active ? 'var(--maw-brandContrast)' : 'var(--maw-fg)',
          fontSize: 'var(--maw-text-sm)',
          fontWeight: active ? 600 : 400,
          cursor: 'pointer',
          textAlign: 'left',
          justifyContent: collapsed ? 'center' : undefined,
          transition: 'var(--maw-transition-fast)',
          marginBottom: 2,
        }}
      >
        {item.icon !== undefined && <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>}
        {!collapsed && (
          <>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge !== undefined && (
              <Badge style={{ background: active ? 'rgba(255,255,255,0.2)' : undefined, color: active ? 'var(--maw-brandContrast)' : undefined }}>
                {item.badge}
              </Badge>
            )}
            {hasChildren && <span style={{ fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>}
          </>
        )}
      </button>
      {hasChildren && expanded && !collapsed && (
        <div>
          {item.children!.map((child) => (
            <SidebarItem key={child.key} item={child} active={false} collapsed={false} onNavigate={onNavigate} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumbs — uses Button from components
// ---------------------------------------------------------------------------

export function Breadcrumbs({ style }: { style?: CSSProperties } = {}): ReactNode {
  const { breadcrumbs, navigate } = useNavigation();
  if (breadcrumbs.length === 0) return null;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)', ...style }}>
      {breadcrumbs.map((crumb, i) => {
        const isLast = i === breadcrumbs.length - 1;
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={{ color: 'var(--maw-fgSubtle)' }}>/</span>}
            {isLast || crumb.path === undefined ? (
              <span style={{ color: isLast ? 'var(--maw-fg)' : undefined, fontWeight: isLast ? 500 : undefined }}>{crumb.label}</span>
            ) : (
              <Button
                variant="ghost"
                onClick={() => navigate(crumb.path!)}
                style={{ border: 'none', padding: 0, fontSize: 'inherit', color: 'var(--maw-brand)' }}
              >
                {crumb.label}
              </Button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// AppShell — standard app layout with sidebar + header + content
// ---------------------------------------------------------------------------

export function AppShell({
  sidebar,
  header,
  children,
  style,
}: {
  sidebar: ReactNode;
  header?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--maw-bgSubtle)', ...style }}>
      {sidebar}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {header !== undefined && (
          <header
            style={{
              ...base,
              padding: 'var(--maw-space-md) var(--maw-space-xl)',
              background: 'var(--maw-bg)',
              borderBottom: '1px solid var(--maw-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 'var(--maw-z-sticky)' as unknown as number,
            }}
          >
            {header}
          </header>
        )}
        <main style={{ flex: 1, padding: 'var(--maw-space-xl)' }}>{children}</main>
      </div>
    </div>
  );
}
