import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { NavItem, SidebarSlot, SidebarViewProps } from '@mawsoftwares/ui-contract';
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
        style={!collapsed && depth > 0 ? { paddingLeft: 16 + depth * 16 } : undefined}
        className={cn(
          'group mb-1 box-border flex w-full cursor-pointer items-center gap-3 border-0 text-left text-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
          collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5',
          active
            ? 'rounded-[var(--maw-comp-nav-item-active-border-radius,var(--maw-comp-nav-item-border-radius,var(--maw-radius-md)))] bg-[var(--maw-comp-nav-item-active-background,var(--maw-shell-nav-active-bg,var(--maw-brand)))] font-semibold text-[var(--maw-comp-nav-item-active-text-color,var(--maw-shell-nav-active-fg,var(--maw-brandContrast)))] shadow-[var(--maw-shell-nav-active-shadow,none),var(--maw-shell-nav-active-indicator,none)]'
            : cn(
                'rounded-[var(--maw-comp-nav-item-border-radius,var(--maw-radius-md))] bg-[var(--maw-comp-nav-item-background,transparent)] font-medium text-[var(--maw-comp-nav-item-text-color,var(--maw-shell-fg,var(--maw-fg)))]',
                'hover:bg-[var(--maw-comp-nav-item-hover-background,var(--maw-shell-hover,var(--maw-bgSubtle)))] hover:text-[var(--maw-comp-nav-item-hover-text-color,var(--maw-brand))]',
                !collapsed && 'hover:translate-x-1',
              ),
        )}
      >
        {item.icon !== undefined && (
          <span className="inline-flex size-[22px] shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <Icon name={item.icon} size={18} />
          </span>
        )}
        {!collapsed && (
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
      {hasChildren && expanded && !collapsed && (
        <div className="py-1">
          {item.children!.map((child) => (
            <SidebarItem key={child.key} item={child} activeKey={activeKey} collapsed={false} onNavigate={onNavigate} depth={depth + 1} />
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
  const width = isMobile
    ? '100%'
    : collapsed
      ? 'var(--maw-layout-shell-sidebar-collapsed, 64px)'
      : 'var(--maw-layout-shell-sidebar-expanded, 260px)';

  const brand =
    logo !== undefined || title !== undefined ? (
      <div className={cn('flex w-full min-w-0 items-center gap-2.5', isRail && 'justify-center')}>
        {logo !== undefined && <span className="inline-flex shrink-0 text-brand">{logo}</span>}
        {!isRail && title !== undefined && (
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold text-[var(--maw-shell-fg,var(--maw-fg))]">
            {title}
          </span>
        )}
      </div>
    ) : undefined;
  const headerContent = resolveSlot(header, isRail) ?? brand;
  const footerContent = resolveSlot(footer, isRail);
  const railPad = isRail ? 'px-2 py-3' : 'p-[var(--maw-space-lg)]';

  return (
    <aside
      className={cn(
        'maw-shell-chrome box-border flex shrink-0 flex-col overflow-hidden font-sans text-[var(--maw-shell-fg,var(--maw-fg))] transition-[width] duration-200 ease-out',
        isMobile
          ? 'min-h-full bg-transparent'
          : 'min-h-screen border-r border-[var(--maw-shell-border,var(--maw-border))] bg-[var(--maw-shell-bg,var(--maw-surface))]',
      )}
      style={{ width, backdropFilter: 'blur(var(--maw-shell-blur, 0px))', WebkitBackdropFilter: 'blur(var(--maw-shell-blur, 0px))', ...style }}
    >
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

      {!isMobile && (
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

      <nav aria-label="Main" className="flex-1 overflow-y-auto p-[var(--maw-comp-shell-sidebar-padding,var(--maw-space-xs))]">
        {Array.from(grouped.entries()).map(([group, groupItems]) => (
          <div key={group}>
            {group !== '' && (!collapsed || isMobile) && (
              <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-[var(--maw-shell-fg-muted,var(--maw-fgSubtle))]">
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
}
