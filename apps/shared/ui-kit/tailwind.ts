/**
 * Build-time kit entry: what `@mawsoftwares/ui-web` resolves to when VITE_UI_KIT=tailwind
 * (see vite.config.ts).
 *
 *  1. `setUIKit(tailwindKit)` installs the Tailwind kit in the shared registry, so ui-web's OWN composites
 *     (ListPage, DynamicForm, navigation, offline UI, …) render Tailwind primitives internally.
 *  2. The named exports below make the app's direct imports (`import { Button } from '@mawsoftwares/ui-web'`)
 *     resolve to the Tailwind components too. Explicit exports win over `export *`.
 *
 * Shared by every app that offers the kit switch (sample-web, sample-desktop) so there is ONE export list to keep in sync.
 * Not under an app's src/ on purpose: `@mawsoftwares/ui-web-base` exists only as a Vite alias, so tsc keeps
 * typechecking each app against the real ui-web.
 */
import { setUIKit } from '@mawsoftwares/ui-contract';
import { tailwindKit } from '@mawsoftwares/ui-web-tailwind';
import './tailwind.css';

setUIKit(tailwindKit);

export * from '@mawsoftwares/ui-web-base';
export {
  Accordion,
  Alert,
  AppShellView,
  Avatar,
  Badge,
  Banner,
  BreadcrumbTrail,
  Button,
  Card,
  Checkbox,
  ConfirmationDialog,
  DataTable,
  DatePicker,
  Dialog,
  Divider,
  DateRangePicker,
  Drawer,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Grid,
  Icon,
  IconButton,
  KpiCard,
  LoadingOverlay,
  Modal,
  Overlay,
  PageLoader,
  Panel,
  Popover,
  Progress,
  RadioGroup,
  MultiSelect,
  SearchableSelect,
  SearchBar,
  Section,
  SettingsLayout,
  Select,
  SidebarView,
  Skeleton,
  Spacer,
  Spinner,
  Stack,
  Tabs,
  TextArea,
  TextField,
  TimePicker,
  Toggle,
  Tooltip,
  Widget,
  Wizard,
} from '@mawsoftwares/ui-web-tailwind';
