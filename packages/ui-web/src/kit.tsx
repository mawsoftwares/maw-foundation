/**
 * Kit resolver. `ui-web` is the default UI kit; an alternative kit (e.g. @mawsoftwares/ui-web-tailwind)
 * is installed once with `setUIKit()` from @mawsoftwares/ui-contract. The composites in this package
 * (ListPage, DynamicForm, navigation, offline UI, …) import their primitives from HERE instead of
 * `./components`, so they render the active kit's Button / Card / Modal / … with no per-call-site change.
 *
 * Internal on purpose (not exported from index.ts): apps import the real components from the package
 * root, exactly as before.
 */
import { createElement, type ComponentType, type ReactNode } from 'react';
import { getUIKitOverride, type UIKit, type UIKitName } from '@mawsoftwares/ui-contract';
import { Accordion as WebAccordion } from './components/Accordion';
import { Alert as WebAlert } from './components/Alert';
import { Avatar as WebAvatar } from './components/Avatar';
import { Banner as WebBanner } from './components/Banner';
import { Overlay as WebOverlay } from './components/Overlay';
import { Panel as WebPanel } from './components/Panel';
import { Popover as WebPopover } from './components/Popover';
import { Progress as WebProgress } from './components/Progress';
import { RadioGroup as WebRadioGroup } from './components/RadioGroup';
import { Wizard as WebWizard } from './components/Wizard';
import { Badge as WebBadge } from './components/Badge';
import { Button as WebButton } from './components/Button';
import { Card as WebCard } from './components/Card';
import { Checkbox as WebCheckbox } from './components/Checkbox';
import { DatePicker as WebDatePicker } from './components/DatePicker';
import { DateRangePicker as WebDateRangePicker } from './components/DateRangePicker';
import { Dialog as WebDialog } from './components/Dialog';
import { Divider as WebDivider } from './components/Divider';
import { Drawer as WebDrawer } from './components/Drawer';
import { DropdownMenu as WebDropdownMenu } from './components/DropdownMenu';
import { ConfirmationDialog as WebConfirmationDialog } from './components/ConfirmationDialog';
import { Grid as WebGrid } from './components/Grid';
import { Icon as WebIcon } from './components/Icon';
import { IconButton as WebIconButton } from './components/IconButton';
import { Modal as WebModal } from './components/Modal';
import { MultiSelect as WebMultiSelect } from './components/MultiSelect';
import { SearchableSelect as WebSearchableSelect } from './components/SearchableSelect';
import { Section as WebSection } from './components/Section';
import { SearchBar as WebSearchBar } from './components/SearchBar';
import { Select as WebSelect } from './components/Select';
import { SettingsLayout as WebSettingsLayout } from './components/SettingsLayout';
import { Spinner as WebSpinner } from './components/Spinner';
import { Spacer as WebSpacer } from './components/Spacer';
import { Stack as WebStack } from './components/Stack';
import { Tabs as WebTabs } from './components/Tabs';
import { TextArea as WebTextArea } from './components/TextArea';
import { TimePicker as WebTimePicker } from './components/TimePicker';
import { Toggle as WebToggle } from './components/Toggle';
import { Tooltip as WebTooltip } from './components/Tooltip';
import { TextField as WebTextField } from './components/TextField';
import { DataTable as WebDataTable } from './data-table';
import { EmptyState as WebEmptyState, ErrorState as WebErrorState, LoadingOverlay as WebLoadingOverlay, PageLoader as WebPageLoader, Skeleton as WebSkeleton } from './states';
import { AppShellView as WebAppShellView, BreadcrumbTrail as WebBreadcrumbTrail, SidebarView as WebSidebarView } from './navigation';
import { KpiCard as WebKpiCard, Widget as WebWidget } from './dashboard';

let defaultKitCache: UIKit | undefined;

/**
 * The default kit. Built lazily (first render) because `data-table.tsx` imports this module and this module
 * imports `data-table.tsx`; reading the components at call time keeps that cycle harmless. Typed as `UIKit`,
 * so a drift between ui-web and the contract fails typecheck.
 */
export function getDefaultKit(): UIKit {
  defaultKitCache ??= {
    Button: WebButton,
    Card: WebCard,
    Badge: WebBadge,
    TextField: WebTextField,
    Select: WebSelect,
    Checkbox: WebCheckbox,
    IconButton: WebIconButton,
    Spinner: WebSpinner,
    Icon: WebIcon,
    Stack: WebStack,
    SidebarView: WebSidebarView,
    AppShellView: WebAppShellView,
    KpiCard: WebKpiCard,
    Widget: WebWidget,
    LoadingOverlay: WebLoadingOverlay,
    SettingsLayout: WebSettingsLayout,
    BreadcrumbTrail: WebBreadcrumbTrail,
    SearchBar: WebSearchBar,
    ErrorState: WebErrorState,
    EmptyState: WebEmptyState,
    PageLoader: WebPageLoader,
    Divider: WebDivider,
    Spacer: WebSpacer,
    Skeleton: WebSkeleton,
    Panel: WebPanel,
    Section: WebSection,
    Grid: WebGrid,
    Accordion: WebAccordion,
    RadioGroup: WebRadioGroup,
    Progress: WebProgress,
    Avatar: WebAvatar,
    Alert: WebAlert,
    Banner: WebBanner,
    Wizard: WebWizard,
    MultiSelect: WebMultiSelect,
    SearchableSelect: WebSearchableSelect,
    TextArea: WebTextArea,
    Toggle: WebToggle,
    DatePicker: WebDatePicker,
    DateRangePicker: WebDateRangePicker,
    TimePicker: WebTimePicker,
    Drawer: WebDrawer,
    Popover: WebPopover,
    DropdownMenu: WebDropdownMenu,
    Tooltip: WebTooltip,
    Tabs: WebTabs,
    Modal: WebModal,
    Dialog: WebDialog,
    Overlay: WebOverlay,
    ConfirmationDialog: WebConfirmationDialog,
    DataTable: WebDataTable,
  };
  return defaultKitCache;
}

let cache: { readonly override: ReturnType<typeof getUIKitOverride>; readonly kit: UIKit } | undefined;

/** Default kit with the installed override laid over it. Memoised on the override's identity. */
export function resolveKit(): UIKit {
  const override = getUIKitOverride();
  if (cache?.override !== override) cache = { override, kit: { ...getDefaultKit(), ...override } };
  return cache.kit;
}

// One proxy per component: renders whichever implementation is active *at render time*.
function proxy<K extends UIKitName>(name: K, displayName: string): UIKit[K] {
  const Proxy = (props: object): ReactNode =>
    createElement(resolveKit()[name] as unknown as ComponentType<object>, props);
  Proxy.displayName = displayName;
  return Proxy as unknown as UIKit[K];
}

export const Button = proxy('Button', 'KitButton');
export const Card = proxy('Card', 'KitCard');
export const Badge = proxy('Badge', 'KitBadge');
export const TextField = proxy('TextField', 'KitTextField');
export const Select = proxy('Select', 'KitSelect');
export const Checkbox = proxy('Checkbox', 'KitCheckbox');
export const IconButton = proxy('IconButton', 'KitIconButton');
export const Spinner = proxy('Spinner', 'KitSpinner');
export const Icon = proxy('Icon', 'KitIcon');
export const Stack = proxy('Stack', 'KitStack');
export const SidebarView = proxy('SidebarView', 'KitSidebarView');
export const AppShellView = proxy('AppShellView', 'KitAppShellView');
export const KpiCard = proxy('KpiCard', 'KitKpiCard');
export const Widget = proxy('Widget', 'KitWidget');
export const LoadingOverlay = proxy('LoadingOverlay', 'KitLoadingOverlay');
export const SettingsLayout = proxy('SettingsLayout', 'KitSettingsLayout');
export const BreadcrumbTrail = proxy('BreadcrumbTrail', 'KitBreadcrumbTrail');
export const SearchBar = proxy('SearchBar', 'KitSearchBar');
export const ErrorState = proxy('ErrorState', 'KitErrorState');
export const EmptyState = proxy('EmptyState', 'KitEmptyState');
export const PageLoader = proxy('PageLoader', 'KitPageLoader');
export const Divider = proxy('Divider', 'KitDivider');
export const Spacer = proxy('Spacer', 'KitSpacer');
export const Skeleton = proxy('Skeleton', 'KitSkeleton');
export const Panel = proxy('Panel', 'KitPanel');
export const Section = proxy('Section', 'KitSection');
export const Grid = proxy('Grid', 'KitGrid');
export const Accordion = proxy('Accordion', 'KitAccordion');
export const RadioGroup = proxy('RadioGroup', 'KitRadioGroup');
export const Progress = proxy('Progress', 'KitProgress');
export const Avatar = proxy('Avatar', 'KitAvatar');
export const Alert = proxy('Alert', 'KitAlert');
export const Banner = proxy('Banner', 'KitBanner');
export const Wizard = proxy('Wizard', 'KitWizard');
export const MultiSelect = proxy('MultiSelect', 'KitMultiSelect');
export const SearchableSelect = proxy('SearchableSelect', 'KitSearchableSelect');
export const TextArea = proxy('TextArea', 'KitTextArea');
export const Toggle = proxy('Toggle', 'KitToggle');
export const DatePicker = proxy('DatePicker', 'KitDatePicker');
export const DateRangePicker = proxy('DateRangePicker', 'KitDateRangePicker');
export const TimePicker = proxy('TimePicker', 'KitTimePicker');
export const Drawer = proxy('Drawer', 'KitDrawer');
export const Popover = proxy('Popover', 'KitPopover');
export const DropdownMenu = proxy('DropdownMenu', 'KitDropdownMenu');
export const Tooltip = proxy('Tooltip', 'KitTooltip');
export const Tabs = proxy('Tabs', 'KitTabs');
export const Modal = proxy('Modal', 'KitModal');
export const Dialog = proxy('Dialog', 'KitDialog');
export const Overlay = proxy('Overlay', 'KitOverlay');
export const ConfirmationDialog = proxy('ConfirmationDialog', 'KitConfirmationDialog');
export const DataTable = proxy('DataTable', 'KitDataTable');
