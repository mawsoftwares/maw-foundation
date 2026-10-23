import type { UIKit } from '@mawsoftwares/ui-contract';
import { Accordion } from './components/Accordion';
import { Alert } from './components/Alert';
import { Avatar } from './components/Avatar';
import { Badge } from './components/Badge';
import { Banner } from './components/Banner';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Checkbox } from './components/Checkbox';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { DataTable } from './components/DataTable';
import { DatePicker } from './components/DatePicker';
import { Dialog } from './components/Dialog';
import { DateRangePicker } from './components/DateRangePicker';
import { AppShellView } from './components/AppShellView';
import { BreadcrumbTrail } from './components/BreadcrumbTrail';
import { Divider } from './components/Divider';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { Drawer } from './components/Drawer';
import { DropdownMenu } from './components/DropdownMenu';
import { Grid } from './components/Grid';
import { Icon } from './components/Icon';
import { IconButton } from './components/IconButton';
import { Modal } from './components/Modal';
import { MultiSelect } from './components/MultiSelect';
import { SearchableSelect } from './components/SearchableSelect';
import { KpiCard } from './components/KpiCard';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Overlay } from './components/Overlay';
import { PageLoader } from './components/PageLoader';
import { Panel } from './components/Panel';
import { Popover } from './components/Popover';
import { Progress } from './components/Progress';
import { RadioGroup } from './components/RadioGroup';
import { SearchBar } from './components/SearchBar';
import { SettingsLayout } from './components/SettingsLayout';
import { Section } from './components/Section';
import { Select } from './components/Select';
import { Spinner } from './components/Spinner';
import { SidebarView } from './components/SidebarView';
import { Skeleton } from './components/Skeleton';
import { Spacer } from './components/Spacer';
import { Stack } from './components/Stack';
import { Tabs } from './components/Tabs';
import { TextArea } from './components/TextArea';
import { TextField } from './components/TextField';
import { TimePicker } from './components/TimePicker';
import { Toggle } from './components/Toggle';
import { Tooltip } from './components/Tooltip';
import { Widget } from './components/Widget';
import { Wizard } from './components/Wizard';

/**
 * The complete Tailwind kit. Typed as `UIKit`, so any drift from the contract is a compile error.
 * Install it once at app startup:  `setUIKit(tailwindKit)`  (from @mawsoftwares/ui-contract).
 */
export const tailwindKit: UIKit = {
  Button,
  Card,
  Badge,
  TextField,
  Select,
  Checkbox,
  IconButton,
  Spinner,
  Icon,
  Stack,
  SidebarView,
  AppShellView,
  KpiCard,
  Widget,
  LoadingOverlay,
  SettingsLayout,
  BreadcrumbTrail,
  SearchBar,
  ErrorState,
  EmptyState,
  PageLoader,
  Divider,
  Spacer,
  Skeleton,
  Panel,
  Section,
  Grid,
  Accordion,
  RadioGroup,
  Progress,
  Avatar,
  Alert,
  Banner,
  Wizard,
  MultiSelect,
  SearchableSelect,
  TextArea,
  Toggle,
  DatePicker,
  DateRangePicker,
  TimePicker,
  Drawer,
  Popover,
  DropdownMenu,
  Tooltip,
  Tabs,
  Modal,
  Dialog,
  Overlay,
  ConfirmationDialog,
  DataTable,
};
