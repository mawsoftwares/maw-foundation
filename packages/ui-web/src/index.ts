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
} from './ui-kit';

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
