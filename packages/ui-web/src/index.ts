// Branding
export {
  BrandProvider,
  useBrand,
  useBrandColors,
  useBrandLogo,
  type BrandProviderProps,
  type BrandContextValue,
  type BrandColorMode,
} from './brand';

// Auth + RBAC
export { AuthProvider, useAuth, useCan, Can, type AuthProviderProps } from './access';
export {
  PermissionRoute,
  AnyPermissionRoute,
  FeatureRoute,
  AccessRoute,
  matchesPermission,
  normalizePermissionCode,
  type PermissionRouteProps,
  type AnyPermissionRouteProps,
  type FeatureRouteProps,
  type AccessRouteProps,
} from './guards';
export { FeatureRegistry, type FeatureDefinition } from './feature-registry';
export {
  DynamicAccessProvider,
  useDynamicAccess,
  type CatalogModule,
  type DynamicAccessSnapshot,
  type DynamicAccessValue,
  type DynamicAccessProviderProps,
} from './dynamic-access';
export { FeatureHost, type FeatureHostProps } from './feature-host';

// i18n
export { I18nProvider, useI18n, useT, useNamespacedT, type I18nProviderProps } from './i18n';

// Theme
export {
  ThemeProvider,
  useTheme,
  useColorMode,
  type ColorMode,
  type ThemeProviderProps,
  type Theme,
  type ThemeOverrides,
  type TenantBranding,
} from './theme';

// Core components
export { Button, TextField, Card, Badge, Divider } from './components';

// UI Kit expansion
export {
  Avatar,
  IconButton,
  TextArea,
  Select,
  Checkbox,
  Toggle,
  Modal,
  Tabs,
  Tooltip,
  Spinner,
  Progress,
  Stack,
  DropdownMenu,
} from './components';

// Toast / Notifications
export { ToastProvider, useToast, type Toast, type ToastVariant } from './toast';

// Error / Loading / Empty states
export {
  ErrorBoundary,
  ErrorState,
  EmptyState,
  Skeleton,
  LoadingOverlay,
  PageLoader,
} from './states';

// Form system
export {
  useForm,
  FormField,
  FormProvider,
  useFormContext,
  type UseFormOptions,
  type UseFormReturn,
  type FieldConfig,
  type FieldValidator,
  type FormFieldState,
  type FormState,
} from './form';

// Data Table
export {
  DataTable,
  useDataTable,
  exportToCsv,
  type ColumnDef,
  type SortDirection,
  type SortState,
  type PaginationState,
  type DataTableProps,
} from './data-table';

// CRUD patterns
export {
  useCrud,
  ListPage,
  FormPage,
  DetailPage,
  DetailField,
  type CrudConfig,
  type ListParams,
  type ListResult,
  type UseCrudReturn,
} from './crud';

// Navigation
export {
  NavigationProvider,
  useNavigation,
  Sidebar,
  Breadcrumbs,
  AppShell,
  type NavItem,
  type BreadcrumbItem,
  type NavigationConfig,
} from './navigation';

// File Upload
export {
  FileUpload,
  useFileUpload,
  type FileEntry,
  type FileUploadConfig,
  type FileUploadProps,
  type UseFileUploadOptions,
  type UseFileUploadReturn,
  type UploadStatus,
} from './file-upload';

// Offline
export {
  OfflineProvider,
  useOffline,
  useNetworkStatus,
  useSyncState,
  useIsOnline,
  NetworkStatusBadge,
  SyncStatusIndicator,
  OfflineBanner,
  ConflictResolutionDialog,
  type OfflineProviderProps,
  type ConflictResolutionDialogProps,
} from './offline';

// Dashboard
export {
  KpiCard,
  KpiGrid,
  Widget,
  WidgetGrid,
  DashboardPage,
  MiniBarChart,
  MiniLineChart,
  ActivityFeed,
  useAutoRefresh,
  type KpiConfig,
  type WidgetConfig,
  type ActivityItem,
} from './dashboard';

// Input Components (Phase 1)
export {
  RadioGroup,
  MultiSelect,
  SearchableSelect,
  DatePicker,
  DateRangePicker,
  TimePicker,
  type RadioOption,
  type RadioGroupProps,
  type MultiSelectOption,
  type MultiSelectProps,
  type SearchableSelectOption,
  type SearchableSelectProps,
  type DatePickerProps,
  type DateRange,
  type DateRangePickerProps,
  type TimePickerProps,
} from './components';

// Overlay & Feedback Components (Phase 2)
export {
  Drawer,
  Dialog,
  Popover,
  Alert,
  Banner,
  ConfirmationDialog,
  type DrawerProps,
  type DialogProps,
  type PopoverProps,
  type AlertVariant,
  type AlertProps,
  type BannerVariant,
  type BannerProps,
  type ConfirmationDialogProps,
} from './components';

// Layout Components (Phase 3)
export {
  Accordion,
  Panel,
  Section,
  Grid,
  Spacer,
  type AccordionItem,
  type AccordionProps,
  type PanelProps,
  type SectionProps,
  type GridProps,
  type SpacerProps,
} from './components';

// Pattern Components (Phase 4)
export {
  Wizard,
  SettingsLayout,
  SearchBar,
  type WizardStep,
  type WizardProps,
  type SettingsGroup,
  type SettingsLayoutProps,
  type SearchBarProps,
} from './components';

// Dynamic Form Engine
export {
  useDynamicForm,
  evaluateCondition,
  type UseDynamicFormOptions,
  type UseDynamicFormReturn,
  type DynamicFieldState,
} from './dynamic-form-engine';

// Dynamic Form Component
export {
  DynamicForm,
  FieldRegistryProvider,
  useFieldRegistry,
  useDynamicFormContext,
  createFieldRegistry,
  mergeRegistry,
  type DynamicFormProps,
} from './dynamic-form';

// DataGrid Engine
export {
  useDataGrid,
  createClientDataSource,
  createServerDataSource,
  type UseDataGridOptions,
  type UseDataGridReturn,
} from './data-grid-engine';

// DataGrid Component
export {
  DataGrid,
  type DataGridProps,
} from './data-grid';

// Responsive Utilities (Phase 5)
export {
  BREAKPOINTS,
  useMediaQuery,
  useBreakpoint,
  useIsMobile,
  Responsive,
  VisuallyHidden,
  useContainerWidth,
  useResponsiveProp,
  ResponsiveContainer,
  type Breakpoint,
  type ResponsiveProps,
  type VisuallyHiddenProps,
  type ResponsiveProp,
  type ResponsiveContainerProps,
} from './responsive';
