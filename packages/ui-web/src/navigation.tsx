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
import { Button, Badge, Drawer, Icon, IconButton } from './components';
import { useIsMobile } from './responsive';

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
  const isMobile = useIsMobile();
  // On mobile, `collapsed` means the overlay drawer is closed. Start closed so the
  // page is visible; desktop still uses collapsed as the icon-rail toggle.
  const [collapsed, setCollapsed] = useState(defaultCollapsed || isMobile);
  const [dynamicItems, setDynamicItems] = useState<NavItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(config.breadcrumbs ?? []);

  useEffect(() => {
    if (config.breadcrumbs !== undefined) setBreadcrumbs(config.breadcrumbs);
  }, [config.breadcrumbs]);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

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

type SidebarSlot = ReactNode | ((collapsed: boolean) => ReactNode);

function resolveSidebarSlot(slot: SidebarSlot | undefined, collapsed: boolean): ReactNode {
  if (slot === undefined) return undefined;
  if (typeof slot === 'function') return slot(collapsed);
  return slot;
}

export function Sidebar({
  header,
  logo,
  title,
  footer,
  style,
}: {
  header?: SidebarSlot;
  logo?: ReactNode;
  title?: ReactNode;
  footer?: SidebarSlot;
  style?: CSSProperties;
}): ReactNode {
  const { items, activeKey, collapsed, navigate, toggleSidebar, setCollapsed } = useNavigation();

  const grouped = useMemo(() => {
    const groups = new Map<string, NavItem[]>();
    for (const item of items) {
      const g = item.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    return groups;
  }, [items]);

  const isMobile = useIsMobile();
  const isRail = collapsed && !isMobile;
  const effectiveWidth = isMobile ? '100%' : (collapsed ? 64 : 260);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setCollapsed(true);
  };

  const resolvedHeader = resolveSidebarSlot(header, isRail);
  const brandHeader = logo !== undefined || title !== undefined
    ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
          width: '100%',
          justifyContent: isRail ? 'center' : undefined,
        }}>
          {logo !== undefined && (
            <span style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--maw-brand)' }}>{logo}</span>
          )}
          {!isRail && title !== undefined && (
            <span style={{
              flex: 1,
              fontWeight: 700,
              fontSize: 'var(--maw-text-md)',
              color: 'var(--maw-fg)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}>
              {title}
            </span>
          )}
        </div>
      )
    : undefined;
  const headerContent = resolvedHeader ?? brandHeader;
  const footerContent = resolveSidebarSlot(footer, isRail);

  return (
    <aside
      style={{
        ...base,
        width: effectiveWidth,
        minHeight: isMobile ? '100%' : '100vh',
        background: isMobile ? 'transparent' : 'var(--maw-surface)',
        borderRight: isMobile ? 'none' : '1px solid var(--maw-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {(headerContent !== undefined || isMobile) && (
        <div style={{
          padding: isRail ? '12px 8px' : 'var(--maw-space-lg)',
          borderBottom: '1px solid var(--maw-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isRail ? 'center' : 'space-between',
          gap: 8,
          minHeight: 56,
          flexShrink: 0,
        }}>
          <div style={{
            minWidth: 0,
            flex: isRail ? undefined : 1,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: isRail ? 'center' : undefined,
          }}>
            {headerContent}
          </div>
          {isMobile && (
            <IconButton label="Close menu" onClick={() => setCollapsed(true)}>
              <Icon name="x" size={18} />
            </IconButton>
          )}
        </div>
      )}

      {!isMobile && (
        <div style={{ padding: 'var(--maw-space-sm)', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
          <IconButton label={collapsed ? 'Expand' : 'Collapse'} onClick={toggleSidebar}>
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={18} />
          </IconButton>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--maw-space-xs)' }}>
        {Array.from(grouped.entries()).map(([group, groupItems]) => (
          <div key={group}>
            {group !== '' && (!collapsed || isMobile) && (
              <div style={{ padding: '8px 12px 4px', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {group}
              </div>
            )}
            {groupItems.map((item) => (
              <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={collapsed && !isMobile} onNavigate={handleNavigate} />
            ))}
          </div>
        ))}
      </nav>

      {footerContent !== undefined && (
        <div style={{
          padding: isRail ? '12px 8px' : 'var(--maw-space-lg)',
          borderTop: '1px solid var(--maw-border)',
          display: 'flex',
          justifyContent: isRail ? 'center' : undefined,
          overflow: 'hidden',
        }}>
          {footerContent}
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
  const [hovered, setHovered] = useState(false);
  const hasChildren = item.children !== undefined && item.children.length > 0;

  return (
    <>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          else onNavigate(item.path);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={collapsed ? item.label : undefined}
        style={{
          ...base,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: collapsed ? '10px' : `10px 16px 10px ${16 + depth * 16}px`,
          border: 'none',
          borderRadius: 'var(--maw-radius-md)',
          background: active 
            ? 'linear-gradient(135deg, var(--maw-brand) 0%, color-mix(in srgb, var(--maw-brand) 80%, black) 100%)' 
            : hovered 
              ? 'var(--maw-bgSubtle)' 
              : 'transparent',
          color: active ? 'var(--maw-brandContrast)' : hovered ? 'var(--maw-brand)' : 'var(--maw-fg)',
          fontSize: 'var(--maw-text-sm)',
          fontWeight: active ? 600 : 500,
          cursor: 'pointer',
          textAlign: 'left',
          justifyContent: collapsed ? 'center' : undefined,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          marginBottom: 4,
          transform: hovered && !active && !collapsed ? 'translateX(4px)' : 'none',
          boxShadow: active ? '0 4px 12px color-mix(in srgb, var(--maw-brand) 30%, transparent)' : 'none',
        }}
      >
        {item.icon !== undefined && (
          <span style={{
            display: 'inline-flex',
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
          }}>
            <Icon name={item.icon} size={18} />
          </span>
        )}
        {!collapsed && (
          <>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            {item.badge !== undefined && (
              <Badge style={{ background: active ? 'rgba(255,255,255,0.25)' : undefined, color: active ? 'var(--maw-brandContrast)' : undefined }}>
                {item.badge}
              </Badge>
            )}
            {hasChildren && (
              <span style={{ display: 'inline-flex', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                <Icon name="chevron-right" size={14} />
              </span>
            )}
          </>
        )}
      </button>
      {hasChildren && expanded && !collapsed && (
        <div style={{ paddingTop: 4, paddingBottom: 4 }}>
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

// ---------------------------------------------------------------------------
// AppShell — standard app layout with sidebar + header + content
// ---------------------------------------------------------------------------

export function AppShell({
  sidebar,
  header,
  actions,
  children,
  style,
}: {
  sidebar: ReactNode;
  header?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  const isMobile = useIsMobile();
  const { collapsed, toggleSidebar, setCollapsed, items, activeKey, breadcrumbs } = useNavigation();
  const pageTitle =
    items.find((item) => item.key === activeKey)?.label
    ?? breadcrumbs[breadcrumbs.length - 1]?.label
    ?? '';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--maw-canvas)', ...style }}>
      {!isMobile && sidebar}
      {isMobile && (
        <Drawer
          open={!collapsed}
          onClose={() => setCollapsed(true)}
          side="left"
          width={280}
          style={{ padding: 0 }}
          contentStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {sidebar}
        </Drawer>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {(header !== undefined || actions !== undefined || isMobile) && (
          <header
            style={{
              ...base,
              minHeight: isMobile ? 48 : undefined,
              padding: isMobile ? '6px 8px 6px 4px' : '12px var(--maw-space-xl)',
              background: 'var(--maw-surface)',
              borderBottom: '1px solid var(--maw-border)',
              boxShadow: isMobile ? 'none' : '0 4px 24px -6px color-mix(in srgb, #000 8%, transparent)',
              overflow: 'visible',
              display: 'flex',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 'var(--maw-z-sticky)' as unknown as number,
              flexShrink: 0,
              gap: isMobile ? 4 : 'var(--maw-space-md)',
            }}
          >
            {isMobile && (
              <IconButton label="Menu" onClick={toggleSidebar}>
                <Icon name="menu" size={18} />
              </IconButton>
            )}
            {isMobile ? (
              <>
                <h1 style={{
                  ...base,
                  flex: 1,
                  minWidth: 0,
                  margin: 0,
                  fontSize: 'var(--maw-text-md)',
                  fontWeight: 600,
                  color: 'var(--maw-fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {pageTitle}
                </h1>
                <div style={{ flexShrink: 0 }}>{actions}</div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minWidth: 0,
                gap: 'var(--maw-space-md)',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>{header}</div>
                <div style={{ flexShrink: 0 }}>{actions}</div>
              </div>
            )}
          </header>
        )}
        <main style={{ flex: 1, padding: isMobile ? 'var(--maw-space-md)' : 'var(--maw-space-xl)', overflowY: 'auto', overflowX: 'hidden' }}>{children}</main>
        {isMobile ? null : (
          <footer style={{
            padding: 'var(--maw-space-lg) var(--maw-space-xl)',
            borderTop: '1px solid var(--maw-border)',
            background: 'var(--maw-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 'var(--maw-text-sm)',
            color: 'var(--maw-fgMuted)',
            flexShrink: 0,
          }}>
            Powered by
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, fontFamily: 'sans-serif', letterSpacing: '0.02em' }}>
              <span style={{ color: '#2b7ec2', fontSize: 16 }}>MINDS</span>
              <span style={{
                background: '#f16d22',
                color: 'white',
                fontSize: 9,
                width: 20,
                height: 20,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}>AT</span>
              <span style={{ color: '#2b7ec2', fontSize: 16 }}>WORK</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
