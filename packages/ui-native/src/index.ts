// Theme
export {
  NativeThemeProvider,
  useNativeTheme,
  useColors,
  useSpacing,
  type ColorMode,
  type NativeThemeProviderProps,
} from './theme';
export type { Theme, ThemeOverrides, TenantBranding, RNStyles } from './theme';

// Branding
export {
  NativeBrandProvider,
  useNativeBrand,
  useNativeBrandColors,
  useNativeBrandLogo,
  type NativeBrandProviderProps,
  type BrandContextValue,
  type BrandColorMode,
} from './brand';

// Core Components
export {
  Button,
  TextField,
  Card,
  Badge,
  Divider,
  type ButtonProps,
  type TextFieldProps,
  type CardProps,
  type BadgeProps,
  type DividerProps,
} from './components';

// UI Kit
export {
  Spinner,
  Avatar,
  IconButton,
  Stack,
  type SpinnerProps,
  type AvatarProps,
  type IconButtonProps,
  type StackProps,
} from './ui-kit';

// States
export {
  ErrorState,
  EmptyState,
  PageLoader,
  type ErrorStateProps,
  type EmptyStateProps,
  type PageLoaderProps,
} from './states';

// Toast
export {
  ToastProvider,
  useToast,
  type Toast,
  type ToastVariant,
} from './toast';

// Modal / Dialog
export {
  Modal,
  Dialog,
  ConfirmationDialog,
  type ModalProps,
  type DialogProps,
  type ConfirmationDialogProps,
} from './modal';

// Data List (analogous to DataTable on web)
export {
  DataList,
  type DataListColumn,
  type DataListProps,
} from './list';

// Form
export {
  useForm,
  FormField,
  FormProvider,
  useFormContext,
  type FieldValidator,
  type FieldConfig,
  type UseFormOptions,
  type UseFormReturn,
} from './form';

// Auth + RBAC
export {
  AuthProvider,
  useAuth,
  useCan,
  Can,
  type AuthProviderProps,
} from './access';

// i18n
export {
  I18nProvider,
  useI18n,
  useT,
  type I18nProviderProps,
} from './i18n';

// Offline
export {
  NetworkStatusBadge,
  OfflineBanner,
  type NetworkStatusBadgeProps,
  type OfflineBannerProps,
} from './offline';

// Responsive
export {
  useBreakpoint,
  useIsMobile,
  useResponsiveProp,
  BREAKPOINTS,
  type Breakpoint,
  type ResponsiveProp,
} from './responsive';

// Navigation helpers
export {
  filterNavByPermissions,
  sortNavItems,
  type NavItem,
  type TabConfig,
} from './navigation';
