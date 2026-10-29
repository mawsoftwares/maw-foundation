import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { NavItem, SidebarLook, SidebarSlot, SidebarViewProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

function resolveSlot(slot: SidebarSlot | undefined, collapsed: boolean): ReactNode {
  if (slot === undefined) return undefined;
  return typeof slot === 'function' ? slot(collapsed) : slot;
}

function itemContainsKey(item: NavItem, key: string): boolean {
  return item.key === key || (item.children?.some((child) => itemContainsKey(child, key)) ?? false);
}

function SidebarItem({
  item,
  activeKey,
  collapsed,
  onNavigate,
  depth = 0,
  look,
  below = false,
  index = 0,
}: {
  item: NavItem;
  activeKey: string;
  collapsed: boolean;
  onNavigate: (path: string) => void;
  depth?: number;
  look?: SidebarLook;
  /** Icon tile with the label underneath. */
  below?: boolean;
  /** Position among the items, for the staggered entrance. */
  index?: number;
}): ReactNode {
  const indicator = look?.indicator ?? 'fill';
  const itemMotion = look?.motion.items ?? 'slide';
  const active = item.key === activeKey;
  const childActive = !active && itemContainsKey(item, activeKey);
  const [expanded, setExpanded] = useState(childActive);
  const hasChildren = item.children !== undefined && item.children.length > 0;

  // A child becoming active (e.g. navigation elsewhere) opens its parent, like ui-web.
  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive]);

  return (
    <>
      <button
        type="button"
        onClick={() => (hasChildren ? setExpanded(!expanded) : onNavigate(item.path))}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
        style={{
          ...(!collapsed && depth > 0 ? { paddingLeft: 16 + depth * 16 } : {}),
          ...(look?.motion.nav === 'stagger' && depth === 0 ? { animationDelay: `${Math.min(index, 12) * 45}ms` } : {}),
        }}
        className={cn(
          'group relative mb-1 box-border flex cursor-pointer items-center border-0 text-left text-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand motion-reduce:transform-none motion-reduce:transition-none',
          !(active && indicator === 'tab') && 'w-full',
          look?.motion.nav === 'stagger' && depth === 0 && 'animate-nav-in motion-reduce:animate-none',
          below ? 'flex-col justify-center gap-1 px-1 py-2 text-center text-[11px] leading-tight' : cn('gap-3', collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'),
          indicator === 'tab' && !collapsed && !below && 'gap-4 py-3.5 pl-6',
          active
            ? cn(
                'rounded-[var(--maw-comp-nav-item-active-border-radius,var(--maw-comp-nav-item-border-radius,var(--maw-radius-md)))] font-semibold',
                indicator === 'fill' &&
                  '[background:var(--maw-comp-nav-item-active-background,var(--maw-shell-nav-active-bg,var(--maw-brand)))] text-[var(--maw-comp-nav-item-active-text-color,var(--maw-shell-nav-active-fg,var(--maw-brandContrast)))] shadow-[var(--maw-shell-nav-active-shadow,none),var(--maw-shell-nav-active-indicator,none)]',
                indicator === 'bar' &&
                  'bg-[color-mix(in_srgb,var(--maw-shell-fg,var(--maw-fg))_12%,transparent)] text-[var(--maw-shell-fg,var(--maw-fg))] shadow-[inset_3px_0_0_var(--maw-shell-fg,var(--maw-fg))]',
                indicator === 'dot' && 'bg-transparent text-[var(--maw-shell-fg,var(--maw-fg))]',
                indicator === 'tab' &&
                  "-mr-[var(--maw-comp-shell-sidebar-padding,var(--maw-space-xs))] w-[calc(100%+var(--maw-comp-shell-sidebar-padding,var(--maw-space-xs)))] rounded-l-full rounded-r-none bg-[var(--maw-canvas)] text-[var(--maw-fg)] before:absolute before:-top-7 before:right-0 before:size-7 before:bg-[radial-gradient(circle_at_0_0,transparent_28px,var(--maw-canvas)_28.5px)] before:content-[''] after:absolute after:-bottom-7 after:right-0 after:size-7 after:bg-[radial-gradient(circle_at_0_100%,transparent_28px,var(--maw-canvas)_28.5px)] after:content-['']",
              )
            : cn(
                'rounded-[var(--maw-comp-nav-item-border-radius,var(--maw-radius-md))] bg-[var(--maw-comp-nav-item-background,transparent)] font-medium text-[var(--maw-comp-nav-item-text-color,var(--maw-shell-fg,var(--maw-fg)))]',
                'hover:bg-[var(--maw-comp-nav-item-hover-background,var(--maw-shell-hover,var(--maw-bgSubtle)))] hover:text-[var(--maw-comp-nav-item-hover-text-color,var(--maw-brand))]',
                itemMotion === 'slide' && !collapsed && !below && 'hover:translate-x-1',
                itemMotion === 'lift' && 'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(0_0_0/0.12)]',
                itemMotion === 'scale' && 'hover:scale-[1.04]',
                itemMotion === 'glow' && 'hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--maw-shell-fg,var(--maw-fg))_20%,transparent)]',
              ),
        )}
      >
        {item.icon !== undefined && (
          <span className="inline-flex size-[22px] shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none">
            <Icon name={item.icon} size={18} />
          </span>
        )}
        {below && <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>}
        {active && indicator === 'dot' && (
          <span
            aria-hidden
            className={cn(
              'absolute size-1.5 rounded-full bg-[var(--maw-shell-fg,var(--maw-fg))]',
              below || collapsed ? 'bottom-1 left-1/2 -translate-x-1/2' : 'right-3 top-1/2 -translate-y-1/2',
            )}
          />
        )}
        {!collapsed && !below && (
          <>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
            {item.badge !== undefined && (
              <Badge
                style={
                  active
                    ? {
                        background: 'color-mix(in srgb, var(--maw-shell-nav-active-fg, var(--maw-brandContrast)) 20%, transparent)',
                        color: 'var(--maw-shell-nav-active-fg, var(--maw-brandContrast))',
                      }
                    : undefined
                }
              >
                {item.badge}
              </Badge>
            )}
            {hasChildren && (
              <span className={cn('inline-flex transition-transform duration-200', expanded && 'rotate-90')}>
                <Icon name="chevron-right" size={14} />
              </span>
            )}
          </>
        )}
      </button>
      {hasChildren && expanded && !collapsed && !below && (
        <div className="py-1">
          {item.children!.map((child) => (
            <SidebarItem key={child.key} item={child} activeKey={activeKey} collapsed={false} onNavigate={onNavigate} depth={depth + 1} look={look} />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Same props as the `SidebarView` in @mawsoftwares/ui-web: grouped navigation with nested, expandable items, an icon-rail collapsed state,
 * optional logo/title/header/footer, and on mobile a close button. Adds `aria-current="page"` on the active item and `aria-expanded`
 * on parents; the colours/spacing still come from the same `--maw-shell-*` / `--maw-comp-nav-item-*` theme tokens.
 */
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
  look,
}: SidebarViewProps): ReactNode {
  const [hovered, setHovered] = useState(false);
  const grouped = useMemo(() => {
    const groups = new Map<string, NavItem[]>();
    for (const item of items) {
      const g = item.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    return groups;
  }, [items]);

  // A rail that expands over the content while hovered/focused (the space it takes in the layout stays the rail's).
  const hoverExpand = look?.expandOnHover === true && collapsed && !isMobile;
  const railWidth = 'var(--maw-layout-shell-sidebar-collapsed, 64px)';
  const below = look?.labels === 'below' && !isMobile;
  const shownCollapsed = hoverExpand && hovered ? false : collapsed && !below;
  const isRail = shownCollapsed && !isMobile;
  const width = isMobile
    ? '100%'
    : below
      ? '88px'
      : shownCollapsed
        ? railWidth
        : 'var(--maw-layout-shell-sidebar-expanded, 260px)';
  const sidebarMotion = look?.motion.sidebar ?? 'smooth';
  const motionStyle: CSSProperties =
    sidebarMotion === 'none'
      ? { transition: 'none' }
      : sidebarMotion === 'spring'
        ? { transitionDuration: '450ms', transitionTimingFunction: 'cubic-bezier(0.34, 1.4, 0.64, 1)' }
        : sidebarMotion === 'snappy'
          ? { transitionDuration: '120ms', transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }
          : sidebarMotion === 'gentle'
            ? { transitionDuration: '600ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }
            : {};

  const brand =
    logo !== undefined || title !== undefined ? (
      <div className={cn('flex w-full min-w-0 items-center gap-2.5', isRail && 'justify-center')}>
        {logo !== undefined && <span className="inline-flex shrink-0 text-[var(--maw-shell-logo,var(--maw-brand))]">{logo}</span>}
        {!isRail && !below && title !== undefined && (
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold text-[var(--maw-shell-fg,var(--maw-fg))]">
            {title}
          </span>
        )}
      </div>
    ) : undefined;
  const headerContent = resolveSlot(header, isRail || below) ?? brand;
  const footerContent = resolveSlot(footer, isRail || below);
  const railPad = isRail ? 'px-2 py-3' : 'p-[var(--maw-space-lg)]';

  let navIndex = 0;
  const aside = (
    <aside
      className={cn(
        'maw-shell-chrome box-border flex shrink-0 flex-col overflow-hidden font-sans text-[var(--maw-shell-fg,var(--maw-fg))] transition-[width] duration-200 ease-out motion-reduce:transition-none',
        hoverExpand ? 'absolute inset-y-0 left-0 z-30' : 'relative isolate',
        hoverExpand && hovered && 'shadow-[0_12px_32px_rgb(0_0_0/0.25)]',
        isMobile
          ? 'min-h-full bg-transparent'
          : cn('min-h-full bg-[var(--maw-shell-bg,var(--maw-surface))]', look?.indicator === 'tab' ? 'border-r-0' : 'border-r border-[var(--maw-shell-border,var(--maw-border))]'),
      )}
      style={{ width, backgroundImage: 'var(--maw-shell-gradient, none)', backdropFilter: 'blur(var(--maw-shell-blur, 0px))', WebkitBackdropFilter: 'blur(var(--maw-shell-blur, 0px))', ...motionStyle, ...style }}
    >
      {!isMobile && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-x-20 -top-28 -z-10 h-80 opacity-55 blur-[20px] [background:radial-gradient(closest-side,color-mix(in_srgb,var(--maw-shell-glow,transparent)_38%,transparent),transparent)]"
        />
      )}
      {(headerContent !== undefined || isMobile) && (
        <div
          className={cn(
            'flex min-h-14 shrink-0 items-center gap-2 border-b border-[var(--maw-shell-border,var(--maw-border))]',
            railPad,
            isRail ? 'justify-center' : 'justify-between',
          )}
        >
          <div className={cn('flex min-w-0 overflow-hidden', isRail ? 'justify-center' : 'flex-1')}>{headerContent}</div>
          {isMobile && (
            <IconButton label="Close menu" onClick={onClose} className="text-[var(--maw-shell-fg-muted,var(--maw-fgMuted))]">
              <Icon name="x" size={18} />
            </IconButton>
          )}
        </div>
      )}

      {!isMobile && collapsible && !hoverExpand && (
        <div className={cn('flex p-[var(--maw-space-sm)]', collapsed ? 'justify-center' : 'justify-end')}>
          <IconButton
            label={collapsed ? 'Expand' : 'Collapse'}
            onClick={onToggleCollapsed}
            className="text-[var(--maw-shell-fg-muted,var(--maw-fgMuted))]"
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={18} />
          </IconButton>
        </div>
      )}

      <nav aria-label="Main" className={cn('flex-1 overflow-y-auto p-[var(--maw-comp-shell-sidebar-padding,var(--maw-space-xs))]', look?.indicator === 'tab' && !below && 'py-7')}>
        {Array.from(grouped.entries()).map(([group, groupItems]) => (
          <div key={group}>
            {group !== '' && !below && (!shownCollapsed || isMobile) && (
              <div className="flex items-center gap-2.5 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-[var(--maw-shell-fg-muted,var(--maw-fgSubtle))] after:h-px after:flex-1 after:bg-[linear-gradient(90deg,var(--maw-shell-group-rule,transparent),transparent)] after:content-['']">
                {group}
              </div>
            )}
            {groupItems.map((item) => (
              <SidebarItem key={item.key} index={navIndex++} item={item} activeKey={activeKey} collapsed={shownCollapsed && !isMobile} onNavigate={onNavigate} look={look} below={below} />
            ))}
          </div>
        ))}
      </nav>

      {footerContent !== undefined && (
        <div
          className={cn(
            'flex overflow-hidden border-t border-[var(--maw-shell-border,var(--maw-border))] text-[var(--maw-shell-fg-muted,var(--maw-fgMuted))]',
            railPad,
            isRail && 'justify-center',
          )}
        >
          {footerContent}
        </div>
      )}
    </aside>
  );

  if (!hoverExpand) return aside;
  return (
    <div
      className="relative min-h-full shrink-0"
      style={{ width: railWidth }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false);
      }}
    >
      {aside}
    </div>
  );
}
