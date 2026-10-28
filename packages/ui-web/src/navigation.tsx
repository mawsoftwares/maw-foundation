import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import type { ResolvedLayout } from '@mawsoftwares/layout';
import { useIsMobile, useMediaQuery } from './responsive';
import { composeSlot, layoutBreakpointPx, layoutMinWidthQuery, sidebarBehavior, toShellFrame, type SidebarBehavior } from './layout/shell-frame';
import {
  AppShellView as KitAppShellView,
  Badge,
  BreadcrumbTrail as KitBreadcrumbTrail,
  Button,
  Drawer,
  Icon,
  IconButton,
  SidebarView as KitSidebarView,
} from './kit';
import type {
  AppShellViewProps,
  BreadcrumbItem,
  BreadcrumbTrailProps,
  NavItem,
  SidebarSlot,
  SidebarViewProps,
} from '@mawsoftwares/ui-contract';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { NavItem };

export type { BreadcrumbItem };

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

function resolveSidebarSlot(slot: SidebarSlot | undefined, collapsed: boolean): ReactNode {
  if (slot === undefined) return undefined;
  if (typeof slot === 'function') return slot(collapsed);
  return slot;
}

export function SidebarView({
  items,
  activeKey,
  collapsed,
  isMobile,
  onNavigate,
  onToggleCollapsed,
  collapsible = true,
  onClose,
  header,
  logo,
  title,
  footer,
  style,
}: SidebarViewProps): ReactNode {
  const grouped = useMemo(() => {
    const groups = new Map<string, NavItem[]>();
    for (const item of items) {
      const g = item.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    return groups;
  }, [items]);

  const isRail = collapsed && !isMobile;
  const effectiveWidth = isMobile
    ? '100%'
    : (collapsed ? 'var(--maw-layout-shell-sidebar-collapsed, 64px)' : 'var(--maw-layout-shell-sidebar-expanded, 260px)');

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
            <span style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--maw-shell-logo, var(--maw-brand))' }}>{logo}</span>
          )}
          {!isRail && title !== undefined && (
            <span style={{
              flex: 1,
              fontWeight: 700,
              fontSize: 'var(--maw-text-md)',
              color: 'var(--maw-shell-fg, var(--maw-fg))',
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
      className="maw-shell-chrome"
      style={{
        ...base,
        width: effectiveWidth,
        minHeight: '100%',
        background: isMobile ? 'transparent' : 'var(--maw-shell-bg, var(--maw-surface))',
        borderRight: isMobile ? 'none' : '1px solid var(--maw-shell-border, var(--maw-border))',
        color: 'var(--maw-shell-fg, var(--maw-fg))',
        backdropFilter: 'blur(var(--maw-shell-blur, 0px))',
        WebkitBackdropFilter: 'blur(var(--maw-shell-blur, 0px))',
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
          borderBottom: '1px solid var(--maw-shell-border, var(--maw-border))',
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
            <IconButton
              label="Close menu"
              onClick={onClose}
              style={{ color: 'var(--maw-shell-fg-muted, var(--maw-fgMuted))' }}
            >
              <Icon name="x" size={18} />
            </IconButton>
          )}
        </div>
      )}

      {!isMobile && collapsible && (
        <div style={{ padding: 'var(--maw-space-sm)', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
          <IconButton
            label={collapsed ? 'Expand' : 'Collapse'}
            onClick={onToggleCollapsed}
            style={{ color: 'var(--maw-shell-fg-muted, var(--maw-fgMuted))' }}
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={18} />
          </IconButton>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--maw-comp-shell-sidebar-padding, var(--maw-space-xs))' }}>
        {Array.from(grouped.entries()).map(([group, groupItems]) => (
          <div key={group}>
            {group !== '' && (!collapsed || isMobile) && (
              <div style={{ padding: '8px 12px 4px', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-shell-fg-muted, var(--maw-fgSubtle))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {group}
              </div>
            )}
            {groupItems.map((item) => (
              <SidebarItem key={item.key} item={item} activeKey={activeKey} collapsed={collapsed && !isMobile} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      {footerContent !== undefined && (
        <div style={{
          padding: isRail ? '12px 8px' : 'var(--maw-space-lg)',
          borderTop: '1px solid var(--maw-shell-border, var(--maw-border))',
          color: 'var(--maw-shell-fg-muted, var(--maw-fgMuted))',
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

/**
 * Set by AppShell so the sidebar agrees with the shell: whether it is in the mobile drawer, and how the layout
 * changes it (forced rail, pinned open, width, which app-provided parts to keep, extra approved components).
 * Absent = the sidebar behaves exactly as it always did.
 */
interface ShellSidebarValue {
  readonly isMobile: boolean;
  readonly behavior?: SidebarBehavior;
  readonly top: readonly ReactNode[];
  readonly bottom: readonly ReactNode[];
}
const ShellSidebarContext = createContext<ShellSidebarValue | undefined>(undefined);

function stackSlot(slot: SidebarSlot | undefined, extras: readonly ReactNode[], collapsed: boolean, fallback?: ReactNode): ReactNode {
  const main = resolveSidebarSlot(slot, collapsed) ?? fallback;
  if (extras.length === 0 || collapsed) return main;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--maw-space-sm)', width: '100%', minWidth: 0 }}>
      {main}
      {extras.map((node, i) => <Fragment key={i}>{node}</Fragment>)}
    </div>
  );
}

/** The sidebar for the navigation context, rendered with the KIT's SidebarView (same props as before: slots + style). */
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
  const defaultIsMobile = useIsMobile();
  const shell = useContext(ShellSidebarContext);
  // A layout can move the mobile breakpoint (AppShell publishes it); otherwise the standard one applies.
  const isMobile = shell?.isMobile ?? defaultIsMobile;
  const behavior = shell?.behavior;
  // Desktop only (on mobile `collapsed` means "drawer closed"): a rail layout is always a rail, a pinned one always open.
  const shownCollapsed = isMobile || behavior === undefined ? collapsed : behavior.forceRail ? true : behavior.collapsible ? collapsed : false;
  const hasExtras = (shell?.top.length ?? 0) > 0;
  const showBrand = behavior?.showBrand ?? true;
  const brand = showBrand ? (logo !== undefined || title !== undefined ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>{logo}{!shownCollapsed && title}</span>
  ) : undefined) : undefined;
  const headerSlot: SidebarSlot | undefined = showBrand
    ? (hasExtras ? (c: boolean) => stackSlot(header, shell?.top ?? [], c, brand) : header)
    : (hasExtras ? (c: boolean) => stackSlot(undefined, shell?.top ?? [], c) : undefined);
  const hasBottom = (shell?.bottom.length ?? 0) > 0;
  const showFooter = behavior?.showFooter ?? true;
  const footerSlot: SidebarSlot | undefined = showFooter
    ? (hasBottom ? (c: boolean) => stackSlot(footer, shell?.bottom ?? [], c) : footer)
    : (hasBottom ? (c: boolean) => stackSlot(undefined, shell?.bottom ?? [], c) : undefined);
  return (
    <KitSidebarView
      items={items}
      activeKey={activeKey}
      collapsed={shownCollapsed}
      isMobile={isMobile}
      collapsible={behavior?.collapsible ?? true}
      onNavigate={(path) => {
        navigate(path);
        if (isMobile) setCollapsed(true);
      }}
      onToggleCollapsed={toggleSidebar}
      onClose={() => setCollapsed(true)}
      header={headerSlot}
      logo={showBrand && headerSlot === header ? logo : undefined}
      title={showBrand && headerSlot === header ? title : undefined}
      footer={footerSlot}
      style={behavior !== undefined && !isMobile && !shownCollapsed ? { width: behavior.widthPx, ...style } : style}
    />
  );
}

function itemContainsKey(item: NavItem, key: string): boolean {
  if (item.key === key) return true;
  return item.children?.some((child) => itemContainsKey(child, key)) ?? false;
}

function SidebarItem({
  item,
  activeKey,
  collapsed,
  onNavigate,
  depth = 0,
}: {
  item: NavItem;
  activeKey: string;
  collapsed: boolean;
  onNavigate: (path: string) => void;
  depth?: number;
}): ReactNode {
  const active = item.key === activeKey;
  const childActive = !active && itemContainsKey(item, activeKey);
  const [expanded, setExpanded] = useState(childActive);
  const [hovered, setHovered] = useState(false);
  const hasChildren = item.children !== undefined && item.children.length > 0;

  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive]);

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
          padding: collapsed
            ? '10px'
            : depth === 0
              ? 'var(--maw-comp-nav-item-padding, 10px 16px)'
              : `10px 16px 10px ${16 + depth * 16}px`,
          border: 'none',
          borderRadius: active
            ? 'var(--maw-comp-nav-item-active-border-radius, var(--maw-comp-nav-item-border-radius, var(--maw-radius-md)))'
            : 'var(--maw-comp-nav-item-border-radius, var(--maw-radius-md))',
          background: active
            ? 'var(--maw-comp-nav-item-active-background, var(--maw-shell-nav-active-bg, var(--maw-brand)))'
            : hovered
              ? 'var(--maw-comp-nav-item-hover-background, var(--maw-shell-hover, var(--maw-bgSubtle)))'
              : 'var(--maw-comp-nav-item-background, transparent)',
          color: active
            ? 'var(--maw-comp-nav-item-active-text-color, var(--maw-shell-nav-active-fg, var(--maw-brandContrast)))'
            : hovered
              ? 'var(--maw-comp-nav-item-hover-text-color, var(--maw-brand))'
              : 'var(--maw-comp-nav-item-text-color, var(--maw-shell-fg, var(--maw-fg)))',
          fontSize: 'var(--maw-text-sm)',
          fontWeight: active ? 600 : 500,
          cursor: 'pointer',
          textAlign: 'left',
          justifyContent: collapsed ? 'center' : undefined,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          marginBottom: 4,
          transform: hovered && !active && !collapsed ? 'translateX(4px)' : 'none',
          boxShadow: active
            ? 'var(--maw-shell-nav-active-shadow, none), var(--maw-shell-nav-active-indicator, none)'
            : 'none',
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
            color: active ? 'var(--maw-shell-nav-active-fg, var(--maw-brandContrast))' : undefined,
          }}>
            <Icon name={item.icon} size={18} />
          </span>
        )}
        {!collapsed && (
          <>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            {item.badge !== undefined && (
              <Badge style={{
                background: active ? 'color-mix(in srgb, var(--maw-shell-nav-active-fg, var(--maw-brandContrast)) 20%, transparent)' : undefined,
                color: active ? 'var(--maw-shell-nav-active-fg, var(--maw-brandContrast))' : undefined,
              }}>
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
            <SidebarItem key={child.key} item={child} activeKey={activeKey} collapsed={false} onNavigate={onNavigate} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// BreadcrumbTrail — presentational (items + onNavigate); the UI-kit contract component
// ---------------------------------------------------------------------------

export function BreadcrumbTrail({ items, onNavigate, style }: BreadcrumbTrailProps): ReactNode {
  if (items.length === 0) return null;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-shell-fg-muted, var(--maw-fgMuted))', ...style }}>
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={{ color: 'var(--maw-fgSubtle)' }}>/</span>}
            {isLast || crumb.path === undefined ? (
              <span style={{ color: isLast ? 'var(--maw-shell-fg, var(--maw-fg))' : undefined, fontWeight: isLast ? 500 : undefined }}>{crumb.label}</span>
            ) : (
              <Button
                variant="ghost"
                onClick={() => onNavigate(crumb.path!)}
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
// Breadcrumbs — the trail from the navigation context, rendered with the KIT's BreadcrumbTrail
// ---------------------------------------------------------------------------

export function Breadcrumbs({ style }: { style?: CSSProperties } = {}): ReactNode {
  const { breadcrumbs, navigate } = useNavigation();
  return <KitBreadcrumbTrail items={breadcrumbs} onNavigate={navigate} style={style} />;
}

// ---------------------------------------------------------------------------
// AppShell — standard app layout with sidebar + header + content
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AppShell — standard app layout with sidebar + header + content
// ---------------------------------------------------------------------------

export function AppShellView({
  sidebar,
  header,
  actions,
  children,
  isMobile,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  pageTitle,
  style,
  frame,
}: AppShellViewProps): ReactNode {
  // The default kit renders the classic frame; from `frame` it honours header on/off, sticky, footer, content width and shape.
  const showHeader = (header !== undefined || actions !== undefined || isMobile) && (frame?.header.enabled ?? true);
  const inset = frame?.shape.frame === 'inset' && !isMobile;
  const shapeVars: CSSProperties | undefined =
    frame === undefined
      ? undefined
      : ({
          '--maw-shell-radius': { sharp: '0px', soft: '12px', round: '24px' }[frame.shape.corners],
          ...(frame.shape.nav === 'pill'
            ? { '--maw-comp-nav-item-border-radius': '9999px', '--maw-comp-nav-item-active-border-radius': '9999px' }
            : {}),
        } as CSSProperties);
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: frame?.sidebar.position === 'right' ? 'row-reverse' : 'row',
        height: inset ? '100%' : 'var(--maw-shell-height, 100vh)',
        overflow: 'hidden',
        background: 'var(--maw-canvas)',
        ...(inset ? { borderRadius: 'var(--maw-shell-radius)', border: '1px solid var(--maw-border)', boxShadow: 'var(--maw-shadow-lg)' } : {}),
      }}
    >
      {!isMobile && sidebar}
      {isMobile && (
        <Drawer
          open={menuOpen}
          onClose={onMenuClose}
          side="left"
          width={280}
          style={{ padding: 0 }}
          contentStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {sidebar}
        </Drawer>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {showHeader && (
          <header
            className="maw-shell-chrome"
            style={{
              ...base,
              minHeight: isMobile ? 48 : 'var(--maw-layout-shell-header-height, auto)',
              padding: isMobile ? '6px 8px 6px 4px' : 'var(--maw-comp-shell-header-padding, 12px var(--maw-space-xl))',
              background: 'var(--maw-shell-header-bg, var(--maw-shell-bg, var(--maw-surface)))',
              borderBottom: '1px solid var(--maw-shell-header-border, var(--maw-shell-border, var(--maw-border)))',
              color: 'var(--maw-shell-header-fg, var(--maw-shell-fg, var(--maw-fg)))',
              backdropFilter: 'blur(var(--maw-shell-blur, 0px))',
              WebkitBackdropFilter: 'blur(var(--maw-shell-blur, 0px))',
              boxShadow: isMobile ? 'none' : '0 4px 24px -6px color-mix(in srgb, #000 8%, transparent)',
              overflow: 'visible',
              display: 'flex',
              alignItems: 'center',
              position: frame?.header.sticky === false ? 'relative' : 'sticky',
              top: 0,
              zIndex: 'var(--maw-z-sticky)' as unknown as number,
              flexShrink: 0,
              gap: isMobile ? 4 : 'var(--maw-space-md)',
            }}
          >
            {isMobile && (
            <IconButton
              label="Menu"
              onClick={onMenuToggle}
              style={{ color: 'var(--maw-shell-fg-muted, var(--maw-fgMuted))' }}
            >
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
                  color: 'var(--maw-shell-fg, var(--maw-fg))',
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
        <main style={{ flex: 1, padding: isMobile ? 'var(--maw-space-md)' : 'var(--maw-space-container-padding, var(--maw-space-xl))', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ width: '100%', maxWidth: frame?.contentWidth === 'full' ? 'none' : 'var(--maw-layout-container-max, none)', margin: '0 auto' }}>{children}</div>
        </main>
        {isMobile && frame?.mobileNav !== undefined && (
          <div style={{ flexShrink: 0, borderTop: '1px solid var(--maw-border)', background: 'var(--maw-surface)' }}>{frame.mobileNav}</div>
        )}
        {isMobile || frame?.footer === false ? null : (
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
  return (
    <div
      style={{
        ...shapeVars,
        ...(inset ? { boxSizing: 'border-box', height: 'var(--maw-shell-height, 100vh)', padding: 'var(--maw-space-lg)', background: 'color-mix(in srgb, var(--maw-brand) 9%, var(--maw-bgSubtle))' } : {}),
        ...style,
      }}
    >
      {content}
    </div>
  );
}

/** Primary destinations as a bottom bar (layouts with `mobileNavigation: 'bottom-bar'`). The drawer stays reachable from the header menu. */
function MobileBottomNav({ items, activeKey, onNavigate }: { items: readonly NavItem[]; activeKey: string; onNavigate: (path: string) => void }): ReactNode {
  const destinations = items.filter((i) => i.path !== '').slice(0, 5);
  if (destinations.length === 0) return null;
  return (
    <nav aria-label="Primary" style={{ display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {destinations.map((item) => {
        const active = itemContainsKey(item, activeKey);
        return (
          <button
            key={item.key}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate(item.path)}
            style={{
              all: 'unset',
              boxSizing: 'border-box',
              flex: 1,
              minWidth: 0,
              minHeight: 48,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '6px 4px',
              fontSize: 'var(--maw-text-xs)',
              fontFamily: 'var(--maw-font-family)',
              color: active ? 'var(--maw-brand)' : 'var(--maw-fgMuted)',
              fontWeight: active ? 600 : 400,
            }}
          >
            {item.icon !== undefined && <Icon name={item.icon} size={20} />}
            <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * The application frame for the navigation context, rendered with the KIT's AppShellView.
 *
 * Without `layout` it behaves exactly as before (`header` / `actions` props, classic frame). With a resolved `layout`
 * (from @mawsoftwares/layout) the structure follows the config: header slots are composed from approved component ids,
 * breakpoints come from `layout.settings.responsive`, and the kit renders the variant. Business content (`children`)
 * never changes.
 *
 * Built-in header ids: `breadcrumbs`, `page-title`, `actions` (the `actions` prop). Other ids (`search`, `notifications`,
 * `theme-toggle`, `user-menu`, …) render only if the app passes them in `slots`.
 */
export function AppShell({
  sidebar,
  header,
  actions,
  children,
  style,
  layout,
  slots,
  rightPanel,
  rightPanelLabel,
  viewportWidth,
}: {
  sidebar: ReactNode;
  header?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  layout?: ResolvedLayout;
  slots?: Readonly<Record<string, ReactNode>>;
  rightPanel?: ReactNode;
  rightPanelLabel?: string;
  /** Evaluate responsive rules at this width instead of the window's (used by Layout Studio's previews). */
  viewportWidth?: number;
}): ReactNode {
  const responsive = layout?.settings.responsive;
  // `md` / `lg` are what useIsMobile and the classic shell always used, so no layout = no change.
  const windowWide = useMediaQuery(layoutMinWidthQuery(responsive?.sidebarCollapseBelow ?? 'md'));
  const windowFits = useMediaQuery(layoutMinWidthQuery(responsive?.rightPanelHideBelow ?? 'lg'));
  const isMobile = viewportWidth !== undefined ? viewportWidth < layoutBreakpointPx(responsive?.sidebarCollapseBelow ?? 'md') : !windowWide;
  const rightPanelFits = viewportWidth !== undefined ? viewportWidth >= layoutBreakpointPx(responsive?.rightPanelHideBelow ?? 'lg') : windowFits;
  const { collapsed, toggleSidebar, setCollapsed, items, activeKey, breadcrumbs, navigate } = useNavigation();
  const pageTitle =
    breadcrumbs[breadcrumbs.length - 1]?.label
    ?? items.find((item) => item.key === activeKey)?.label
    ?? '';

  // Apply the layout's starting state (desktop only) whenever the layout changes — in both directions, so leaving a
  // rail layout re-opens the sidebar. Not on every render, so the user's own toggling is never fought.
  const startCollapsed = layout?.settings.sidebar.defaultCollapsed === true;
  const hasLayout = layout !== undefined;
  const presetId = layout?.presetId;
  useEffect(() => {
    if (hasLayout && !isMobile) setCollapsed(startCollapsed);
  }, [presetId, startCollapsed, hasLayout]);

  let sidebarContext: ShellSidebarValue | undefined;
  let headerNode = header;
  let actionsNode = actions;
  let frame;
  if (layout !== undefined) {
    const renderers: Record<string, ReactNode> = {
      breadcrumbs: <Breadcrumbs />,
      'page-title': <h1 style={{ margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600 }}>{pageTitle}</h1>,
      actions,
      ...slots,
    };
    // Header groups lay their components out in a row, whatever each one renders (block search box, icon button, avatar…).
    const toRow = (nodes: ReactNode[]): ReactNode =>
      nodes.length === 0 ? undefined : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-sm)', minWidth: 0 }}>
          {nodes.map((node, i) => <Fragment key={i}>{node}</Fragment>)}
        </div>
      );
    headerNode = toRow(composeSlot(layout.settings.header.start, renderers));
    actionsNode = toRow(composeSlot(layout.settings.header.end, renderers));
    const behavior = sidebarBehavior(layout.settings);
    sidebarContext = {
      isMobile,
      behavior,
      top: composeSlot(behavior.topExtras, renderers),
      bottom: composeSlot(behavior.bottomExtras, renderers),
    };
    frame = toShellFrame(layout.settings, {
      rightPanel,
      rightPanelLabel,
      rightPanelFits,
      mobileNav: <MobileBottomNav items={items} activeKey={activeKey} onNavigate={navigate} />,
    });
  }

  return (
    <ShellSidebarContext.Provider value={sidebarContext ?? { isMobile, top: [], bottom: [] }}>
      <KitAppShellView
        sidebar={layout?.settings.sidebar.enabled === false ? null : sidebar}
        header={headerNode}
        actions={actionsNode}
        isMobile={isMobile}
        menuOpen={!collapsed}
        onMenuToggle={toggleSidebar}
        onMenuClose={() => setCollapsed(true)}
        pageTitle={pageTitle}
        style={style}
        frame={frame}
      >
        {children}
      </KitAppShellView>
    </ShellSidebarContext.Provider>
  );
}
