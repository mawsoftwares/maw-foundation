import type { CSSProperties, ReactNode } from 'react';
import {
  Bell,
  Box,
  Building2,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  Flag,
  Folder,
  Globe,
  Key,
  LayoutDashboard,
  List,
  Lock,
  Mail,
  Menu,
  Package,
  Palette,
  Puzzle,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  ShoppingCart,
  TrendingUp,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Same names (and menu-key aliases) as the `Icon` in @mawsoftwares/ui-web, rendered by lucide-react —
 * the icon set shadcn uses — instead of a hand-maintained path table. Add an icon = add one import + map entry.
 */
const ICONS = {
  'layout-dashboard': LayoutDashboard,
  'shopping-cart': ShoppingCart,
  'bar-chart': ChartColumn,
  'clipboard-list': ClipboardList,
  'credit-card': CreditCard,
  users: Users,
  'scroll-text': ScrollText,
  lock: Lock,
  database: Database,
  key: Key,
  flag: Flag,
  settings: Settings,
  puzzle: Puzzle,
  clock: Clock,
  bell: Bell,
  palette: Palette,
  zap: Zap,
  box: Box,
  'building-2': Building2,
  package: Package,
  folder: Folder,
  globe: Globe,
  mail: Mail,
  list: List,
  menu: Menu,
  x: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  receipt: Receipt,
  'trending-up': TrendingUp,
  shield: Shield,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

const ALIASES: Record<string, IconName> = {
  dashboard: 'layout-dashboard',
  orders: 'shopping-cart',
  reports: 'bar-chart',
  inventory: 'clipboard-list',
  billing: 'credit-card',
  'audit-logs': 'scroll-text',
  account: 'lock',
  masters: 'database',
  rbac: 'key',
  'feature-flags': 'flag',
  platform: 'puzzle',
  jobs: 'clock',
  notifications: 'bell',
  showcase: 'palette',
  superadmin: 'shield',
};

function resolveIconName(name: string): IconName | undefined {
  if (name in ICONS) return name as IconName;
  return ALIASES[name];
}

export function isKnownIcon(name: string): boolean {
  return resolveIconName(name) !== undefined;
}

export interface IconProps {
  readonly name: string;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly style?: CSSProperties;
  readonly className?: string;
  readonly title?: string;
}

export function Icon({ name, size = 18, strokeWidth = 1.75, style, className, title }: IconProps): ReactNode {
  const resolved = resolveIconName(name);
  if (resolved === undefined) {
    // Unknown names render as text (emoji / glyph) exactly like ui-web.
    return (
      <span
        className={className}
        title={title}
        aria-hidden={title === undefined}
        style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', ...style }}
      >
        {name}
      </span>
    );
  }
  const Glyph = ICONS[resolved];
  return (
    <Glyph
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={title === undefined}
      role={title === undefined ? undefined : 'img'}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {title !== undefined && <title>{title}</title>}
    </Glyph>
  );
}
