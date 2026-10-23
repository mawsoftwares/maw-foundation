/**
 * UI contract — the prop types every web UI kit implements, plus the registry that lets a kit
 * replace the default primitives at build time.
 *
 * - `@mawsoftwares/ui-web` is the default kit; its composites (ListPage, DynamicForm, navigation, …) render
 *   primitives through `resolveKit()`.
 * - Another kit (e.g. `@mawsoftwares/ui-web-tailwind`) exports a `UIKit` object; the app calls
 *   `setUIKit(kit)` once at startup and every composite then renders that kit's primitives.
 *
 * Both sides are type-checked against `UIKit`, so a kit that drifts from the contract fails `pnpm typecheck`.
 * Types only (React types as peer) — it sits below every ui-* package in the dependency law.
 */
import type {
  ButtonHTMLAttributes,
  RefObject,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** A value, or a per-breakpoint object (xs < sm 640 < md 768 < lg 1024 < xl 1280 < 2xl 1536). */
export type ResponsiveProp<T> =
  | T
  | {
      readonly xs?: T;
      readonly sm?: T;
      readonly md?: T;
      readonly lg?: T;
      readonly xl?: T;
      readonly '2xl'?: T;
    };

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive' | 'link';
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Forces `disabled` and shows a spinner ahead of the label. */
  loading?: boolean;
};

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'interactive';
export interface CardProps {
  readonly children: ReactNode;
  readonly variant?: CardVariant;
  readonly padding?: ResponsiveProp<string>;
  readonly style?: CSSProperties;
}

export type BadgeVariant = 'default' | 'neutral' | 'success' | 'danger' | 'warning' | 'info';
export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  style?: CSSProperties;
}

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
};

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
};

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  style?: CSSProperties;
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string };

export interface SpinnerProps {
  size?: number;
  style?: CSSProperties;
}

export interface IconProps {
  readonly name: string;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly style?: CSSProperties;
  readonly className?: string;
  readonly title?: string;
}

export interface StackProps {
  readonly direction?: ResponsiveProp<'row' | 'column'>;
  readonly gap?: ResponsiveProp<string | number>;
  readonly align?: ResponsiveProp<CSSProperties['alignItems']>;
  readonly justify?: ResponsiveProp<CSSProperties['justifyContent']>;
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface RadioGroupProps {
  readonly label?: string;
  /** Form field name (the selected value is submitted under it). */
  readonly name: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly RadioOption[];
  readonly error?: string;
  readonly disabled?: boolean;
  readonly direction?: 'row' | 'column';
  readonly required?: boolean;
  readonly style?: CSSProperties;
}

export interface ProgressProps {
  readonly value: number;
  readonly max?: number;
  /** Bar thickness in px (default 8). */
  readonly height?: number;
  readonly style?: CSSProperties;
}

export interface AvatarProps {
  /** Image URL; if missing or it fails to load, the initials of `name` are shown. */
  readonly src?: string;
  readonly name?: string;
  readonly size?: number;
  readonly style?: CSSProperties;
}

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
export interface AlertProps {
  readonly variant?: AlertVariant;
  readonly title?: string;
  readonly children: ReactNode;
  readonly onDismiss?: () => void;
  /** Text/emoji glyph replacing the default variant icon. */
  readonly icon?: string;
  readonly style?: CSSProperties;
}

export type BannerVariant = 'info' | 'success' | 'warning' | 'danger';
export interface BannerProps {
  readonly variant?: BannerVariant;
  readonly children: ReactNode;
  readonly onDismiss?: () => void;
  readonly action?: ReactNode;
  readonly style?: CSSProperties;
}

export interface WizardStep {
  readonly key: string;
  readonly title: string;
  readonly content: ReactNode;
  /** `false` disables "Next" on this step. */
  readonly isValid?: boolean;
}

export interface WizardProps {
  readonly steps: readonly WizardStep[];
  readonly activeStep: number;
  readonly onStepChange: (step: number) => void;
  readonly onComplete?: () => void;
  readonly completeLabel?: string;
  readonly nextLabel?: string;
  readonly backLabel?: string;
  readonly style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface PanelProps {
  readonly title?: string;
  readonly children: ReactNode;
  /** Controls rendered at the right of the header (only shown when `title` is set). */
  readonly actions?: ReactNode;
  /** Adds a toggle to the header; the body unmounts while collapsed. */
  readonly collapsible?: boolean;
  readonly defaultCollapsed?: boolean;
  readonly variant?: 'default' | 'outlined' | 'elevated';
  readonly style?: CSSProperties;
}

export interface SectionProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly style?: CSSProperties;
}

export interface GridProps {
  readonly children: ReactNode;
  /** A column count, or any `grid-template-columns` string; default auto-fills 250px+ columns. */
  readonly columns?: ResponsiveProp<number | string>;
  readonly gap?: ResponsiveProp<string | number>;
  /** Auto-fill as many columns as fit at least this many px wide (overrides `columns`). */
  readonly minChildWidth?: number;
  readonly style?: CSSProperties;
}

export interface AccordionItem {
  readonly key: string;
  readonly title: string;
  readonly content: ReactNode;
  readonly disabled?: boolean;
}

export interface AccordionProps {
  readonly items: readonly AccordionItem[];
  /** Allow several items open at once (default: opening one closes the others). */
  readonly multiple?: boolean;
  /** Keys open on first render (uncontrolled afterwards). */
  readonly defaultExpanded?: readonly string[];
  readonly style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Floating UI
// ---------------------------------------------------------------------------

/** A controlled floating panel positioned against an element you own (`anchorRef`). */
export interface PopoverProps {
  readonly open: boolean;
  /** Called on Escape or a click outside both the panel and the anchor. */
  readonly onClose: () => void;
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
  readonly placement?: 'top' | 'bottom' | 'left' | 'right';
  readonly align?: 'start' | 'center' | 'end';
  readonly style?: CSSProperties;
}

export interface DropdownMenuItem {
  readonly key: string;
  readonly label: string;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  /** Shown as a native tooltip on a disabled item, explaining why it is unavailable. */
  readonly disabledReason?: string;
  readonly onClick: () => void;
}

export interface DropdownMenuProps {
  /** Anything clickable; the menu opens from it and is aligned to its right edge. */
  readonly trigger: ReactNode;
  readonly items: readonly DropdownMenuItem[];
}

export interface TooltipProps {
  readonly content: string;
  /** Wrapped in an inline box so the tooltip also works over disabled controls. */
  readonly children: ReactNode;
}

// ---------------------------------------------------------------------------
// Separators and placeholders
// ---------------------------------------------------------------------------

/** A horizontal rule. Spacing comes from the kit's defaults; pass `style={{ margin }}` to override. */
export interface DividerProps {
  readonly style?: CSSProperties;
}

export interface SpacerProps {
  /** Any CSS length (default one medium theme step). */
  readonly size?: string;
  /** `vertical` is a full-width block of that height; `horizontal` an inline block of that width. */
  readonly axis?: 'horizontal' | 'vertical';
  readonly style?: CSSProperties;
}

/** A loading placeholder block. Kits animate it (shimmer/pulse); a number `width` is px, a string any CSS length. */
export interface SkeletonProps {
  readonly width?: string | number;
  readonly height?: number;
  readonly borderRadius?: string | number;
  readonly style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Search and page states
// ---------------------------------------------------------------------------

export interface SearchBarProps {
  readonly value: string;
  /** Called on every keystroke (and with '' when cleared). */
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  /** Delay before `onSearch` fires after the last keystroke (default 300). */
  readonly debounceMs?: number;
  /** Debounced query callback; clearing calls it immediately with ''. */
  readonly onSearch?: (query: string) => void;
  readonly loading?: boolean;
  readonly style?: CSSProperties;
}

/** A centred "something failed" block with an optional retry button. */
export interface ErrorStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly retry?: () => void;
  readonly style?: CSSProperties;
}

/** A centred "nothing here" block; `icon` is a text/emoji glyph (kits may also resolve icon names). */
export interface EmptyStateProps {
  readonly icon?: string;
  readonly title?: string;
  readonly message?: string;
  readonly action?: ReactNode;
  readonly style?: CSSProperties;
}

/** A full-page spinner with an optional message. */
export interface PageLoaderProps {
  readonly message?: string;
}

// ---------------------------------------------------------------------------
// Loading, settings and wayfinding
// ---------------------------------------------------------------------------

export interface LoadingOverlayProps {
  readonly loading: boolean;
  /** The content to cover while loading. */
  readonly children: ReactNode;
  readonly label?: string;
}

export interface SettingsGroup {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

/** Settings as titled groups: the title/description on one side, the controls on the other. */
export interface SettingsLayoutProps {
  readonly groups: readonly SettingsGroup[];
  readonly style?: CSSProperties;
}

export interface BreadcrumbItem {
  readonly label: string;
  /** Items with a path (except the last) are links; the rest are plain text. */
  readonly path?: string;
}

/**
 * A breadcrumb trail. Presentational on purpose: `ui-web`'s `Breadcrumbs` reads the trail from its navigation context and
 * renders this, so a kit never needs to know about that context. Renders nothing for an empty trail.
 */
export interface BreadcrumbTrailProps {
  readonly items: readonly BreadcrumbItem[];
  readonly onNavigate: (path: string) => void;
  readonly style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// App shell and dashboard
// ---------------------------------------------------------------------------

export interface NavItem {
  key: string;
  label: string;
  /** An icon name the kit resolves (`users`, `database`, …) or a text/emoji glyph. */
  icon?: string;
  path: string;
  permission?: string;
  badge?: string | number;
  children?: NavItem[];
  sortOrder?: number;
  /** Items sharing a `group` are listed under that heading; items without one are listed first, unheaded. */
  group?: string;
}

/** Sidebar header/footer content; a function receives whether the sidebar is currently a collapsed icon rail. */
export type SidebarSlot = ReactNode | ((collapsed: boolean) => ReactNode);

/**
 * The navigation sidebar, presentational: all state arrives as props. `ui-web`'s `Sidebar` reads its navigation context and renders
 * this, so a kit never needs that context. On mobile it is shown inside a drawer (see AppShellView) rather than as a rail.
 */
export interface SidebarViewProps {
  readonly items: readonly NavItem[];
  readonly activeKey: string;
  /** Desktop: collapsed to an icon rail. Mobile: the drawer is closed. */
  readonly collapsed: boolean;
  readonly isMobile: boolean;
  /** Called with the item's `path`; the caller decides what else happens (e.g. closing the mobile drawer). */
  readonly onNavigate: (path: string) => void;
  /** The desktop expand/collapse button. */
  readonly onToggleCollapsed: () => void;
  /** The mobile close button. */
  readonly onClose: () => void;
  readonly header?: SidebarSlot;
  readonly logo?: ReactNode;
  readonly title?: ReactNode;
  readonly footer?: SidebarSlot;
  readonly style?: CSSProperties;
}

/**
 * The application frame: sidebar, header bar, scrolling content and footer; on mobile the sidebar moves into a left drawer and the
 * header shows a menu button and `pageTitle`. Presentational, like SidebarView: `ui-web`'s `AppShell` derives these props from context.
 */
export interface AppShellViewProps {
  readonly sidebar: ReactNode;
  /** Desktop header content (usually breadcrumbs). */
  readonly header?: ReactNode;
  /** Right-hand header controls. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly isMobile: boolean;
  /** Mobile: is the sidebar drawer open. */
  readonly menuOpen: boolean;
  readonly onMenuToggle: () => void;
  readonly onMenuClose: () => void;
  /** Mobile header title (current page). */
  readonly pageTitle: string;
  readonly style?: CSSProperties;
}

export interface KpiConfig {
  label: string;
  value: string | number;
  previousValue?: string | number;
  /** Percent change; sign picks the arrow and colour. */
  change?: number;
  changeLabel?: string;
  /** Icon name the kit resolves, or a text/emoji glyph. */
  icon?: string;
  /** CSS colour for the value and icon. */
  color?: string;
}

export type KpiCardProps = KpiConfig & { readonly style?: CSSProperties };

export interface WidgetProps {
  readonly title: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** Grid columns to span (inside a Grid). */
  readonly span?: ResponsiveProp<1 | 2 | 3 | 4>;
  /** Fixed height in px; the body scrolls. */
  readonly height?: number;
  readonly style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Navigation / overlays
// ---------------------------------------------------------------------------

export interface TabsProps {
  tabs: readonly { key: string; label: string }[];
  activeTab: string;
  onChange: (key: string) => void;
  style?: CSSProperties;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export interface DrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly side?: 'left' | 'right';
  readonly width?: number | string;
  /** Stretch the panel to the viewport on small screens. Defaults to true for right-side drawers (forms), false for left-side drawers (nav). */
  readonly fullWidthOnMobile?: boolean;
  readonly style?: CSSProperties;
  readonly contentStyle?: CSSProperties;
}

export interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly width?: number;
  /** Close when the backdrop is clicked (default true). Escape and the close button always close. */
  readonly closeOnOverlay?: boolean;
  /** Applied to the dialog panel. */
  readonly style?: CSSProperties;
}

/** Renders the same content either as a side `Drawer` (default) or a centered `Modal`. */
export interface OverlayProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly width?: number;
  readonly layout?: 'drawer' | 'modal';
}

export interface ConfirmationDialogProps {
  readonly open: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly title?: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: 'primary' | 'danger';
  readonly loading?: boolean;
}

// ---------------------------------------------------------------------------
// Date input
// ---------------------------------------------------------------------------

/** Values are ISO calendar dates (`YYYY-MM-DD`), or `''` for none; `min` / `max` use the same format. */
export interface DatePickerProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly min?: string;
  readonly max?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly locale?: string;
  readonly style?: CSSProperties;
}

export interface DateRange {
  readonly start: string;
  readonly end: string;
}

export interface DateRangePickerProps {
  readonly label?: string;
  readonly value: DateRange;
  readonly onChange: (value: DateRange) => void;
  readonly min?: string;
  readonly max?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

/** Values are 24-hour `HH:mm` strings, or `''` for none; `step` is minutes between choices. */
export interface TimePickerProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly step?: number;
  readonly use24Hour?: boolean;
  readonly min?: string;
  readonly max?: string;
  readonly placeholder?: string;
  readonly style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Option pickers
// ---------------------------------------------------------------------------

export interface MultiSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface MultiSelectProps {
  readonly label?: string;
  readonly value: readonly string[];
  readonly onChange: (value: readonly string[]) => void;
  readonly options: readonly MultiSelectOption[];
  readonly placeholder?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  /** Show the inline filter input (default true). */
  readonly searchable?: boolean;
  readonly maxSelections?: number;
  readonly required?: boolean;
  readonly style?: CSSProperties;
}

export interface SearchableSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SearchableSelectProps {
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Static options, filtered locally as the user types. */
  readonly options?: readonly SearchableSelectOption[];
  /** Async source, called (debounced) with the query whenever the list is open; takes precedence over `options`. */
  readonly loadOptions?: (query: string) => Promise<readonly SearchableSelectOption[]>;
  readonly placeholder?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly clearable?: boolean;
  readonly debounceMs?: number;
  readonly required?: boolean;
  readonly style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  columns: readonly ColumnDef<T>[];
  data: readonly T[];
  keyField: keyof T;

  sort?: SortState;
  onSort?: (sort: SortState) => void;

  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];

  selectable?: boolean;
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;

  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;

  loading?: boolean;
  emptyMessage?: string;
  compact?: boolean;
  stickyHeader?: boolean;
  responsive?: boolean;
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// The kit
// ---------------------------------------------------------------------------

/** Every component a kit must provide. A kit may accept extra optional props, never fewer. */
export interface UIKit {
  Button: (props: ButtonProps) => ReactNode;
  Card: (props: CardProps) => ReactNode;
  Badge: (props: BadgeProps) => ReactNode;
  TextField: (props: TextFieldProps) => ReactNode;
  Select: (props: SelectProps) => ReactNode;
  Checkbox: (props: CheckboxProps) => ReactNode;
  IconButton: (props: IconButtonProps) => ReactNode;
  Spinner: (props: SpinnerProps) => ReactNode;
  Icon: (props: IconProps) => ReactNode;
  Stack: (props: StackProps) => ReactNode;
  SidebarView: (props: SidebarViewProps) => ReactNode;
  AppShellView: (props: AppShellViewProps) => ReactNode;
  KpiCard: (props: KpiCardProps) => ReactNode;
  Widget: (props: WidgetProps) => ReactNode;
  LoadingOverlay: (props: LoadingOverlayProps) => ReactNode;
  SettingsLayout: (props: SettingsLayoutProps) => ReactNode;
  BreadcrumbTrail: (props: BreadcrumbTrailProps) => ReactNode;
  SearchBar: (props: SearchBarProps) => ReactNode;
  ErrorState: (props: ErrorStateProps) => ReactNode;
  EmptyState: (props: EmptyStateProps) => ReactNode;
  PageLoader: (props: PageLoaderProps) => ReactNode;
  Divider: (props: DividerProps) => ReactNode;
  Spacer: (props: SpacerProps) => ReactNode;
  Skeleton: (props: SkeletonProps) => ReactNode;
  Panel: (props: PanelProps) => ReactNode;
  Section: (props: SectionProps) => ReactNode;
  Grid: (props: GridProps) => ReactNode;
  Accordion: (props: AccordionProps) => ReactNode;
  RadioGroup: (props: RadioGroupProps) => ReactNode;
  Progress: (props: ProgressProps) => ReactNode;
  Avatar: (props: AvatarProps) => ReactNode;
  Alert: (props: AlertProps) => ReactNode;
  Banner: (props: BannerProps) => ReactNode;
  Wizard: (props: WizardProps) => ReactNode;
  MultiSelect: (props: MultiSelectProps) => ReactNode;
  SearchableSelect: (props: SearchableSelectProps) => ReactNode;
  TextArea: (props: TextAreaProps) => ReactNode;
  Toggle: (props: ToggleProps) => ReactNode;
  DatePicker: (props: DatePickerProps) => ReactNode;
  DateRangePicker: (props: DateRangePickerProps) => ReactNode;
  TimePicker: (props: TimePickerProps) => ReactNode;
  Drawer: (props: DrawerProps) => ReactNode;
  Popover: (props: PopoverProps) => ReactNode;
  DropdownMenu: (props: DropdownMenuProps) => ReactNode;
  Tooltip: (props: TooltipProps) => ReactNode;
  Tabs: (props: TabsProps) => ReactNode;
  Modal: (props: ModalProps) => ReactNode;
  Dialog: (props: DialogProps) => ReactNode;
  Overlay: (props: OverlayProps) => ReactNode;
  ConfirmationDialog: (props: ConfirmationDialogProps) => ReactNode;
  DataTable: <T extends object>(props: DataTableProps<T>) => ReactNode;
}

export type UIKitName = keyof UIKit;

/** A kit may cover only part of the contract; anything it omits keeps the default (ui-web) implementation. */
export type UIKitOverride = Partial<UIKit>;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

let activeOverride: UIKitOverride = {};

/** Install a kit. Call once at app startup, before the first render. Pass `{}` to restore the default. */
export function setUIKit(kit: UIKitOverride): void {
  activeOverride = kit;
}

/** The installed override (an empty object when none). Identity changes only when `setUIKit` is called. */
export function getUIKitOverride(): UIKitOverride {
  return activeOverride;
}
