const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');

// DateRangePicker needs parseDateISO, CalendarPanel from DatePicker
let dateRange = fs.readFileSync(path.join(componentsDir, 'DateRangePicker.tsx'), 'utf-8');
dateRange = "import { parseDateISO, CalendarPanel } from './DatePicker';\n" + dateRange;
fs.writeFileSync(path.join(componentsDir, 'DateRangePicker.tsx'), dateRange);

// DatePicker needs to export parseDateISO, CalendarPanel
let datePicker = fs.readFileSync(path.join(componentsDir, 'DatePicker.tsx'), 'utf-8');
datePicker = datePicker.replace('function parseDateISO', 'export function parseDateISO');
datePicker = datePicker.replace('function CalendarPanel', 'export function CalendarPanel');
fs.writeFileSync(path.join(componentsDir, 'DatePicker.tsx'), datePicker);

// Modal needs IconButton
let modal = fs.readFileSync(path.join(componentsDir, 'Modal.tsx'), 'utf-8');
modal = "import { IconButton } from './IconButton';\n" + modal;
fs.writeFileSync(path.join(componentsDir, 'Modal.tsx'), modal);

// AlertVariant is in Alert.tsx, but others need it
let alertStr = fs.readFileSync(path.join(componentsDir, 'Alert.tsx'), 'utf-8');
// Check if AlertVariant is there
// Yes, AlertVariant is in Alert.tsx

// Banner needs AlertVariant
let banner = fs.readFileSync(path.join(componentsDir, 'Banner.tsx'), 'utf-8');
banner = "import type { AlertVariant } from './Alert';\n" + banner;
fs.writeFileSync(path.join(componentsDir, 'Banner.tsx'), banner);

// ConfirmationDialog needs AlertVariant and BannerVariant
let confDialog = fs.readFileSync(path.join(componentsDir, 'ConfirmationDialog.tsx'), 'utf-8');
confDialog = "import type { AlertVariant } from './Alert';\nimport type { BannerVariant } from './Banner';\n" + confDialog;
fs.writeFileSync(path.join(componentsDir, 'ConfirmationDialog.tsx'), confDialog);

// Dialog needs AlertVariant and BannerVariant
let dialog = fs.readFileSync(path.join(componentsDir, 'Dialog.tsx'), 'utf-8');
dialog = "import type { AlertVariant } from './Alert';\nimport type { BannerVariant } from './Banner';\n" + dialog;
fs.writeFileSync(path.join(componentsDir, 'Dialog.tsx'), dialog);

// Drawer needs AlertVariant and BannerVariant
let drawer = fs.readFileSync(path.join(componentsDir, 'Drawer.tsx'), 'utf-8');
drawer = "import type { AlertVariant } from './Alert';\nimport type { BannerVariant } from './Banner';\n" + drawer;
fs.writeFileSync(path.join(componentsDir, 'Drawer.tsx'), drawer);

// Popover needs AlertVariant and BannerVariant
let popover = fs.readFileSync(path.join(componentsDir, 'Popover.tsx'), 'utf-8');
popover = "import type { AlertVariant } from './Alert';\nimport type { BannerVariant } from './Banner';\n" + popover;
fs.writeFileSync(path.join(componentsDir, 'Popover.tsx'), popover);

// Alert uses BannerVariant? Wait, the error was "Cannot find name BannerVariant in Alert.tsx"
// Oh, the error was: src/components/Alert.tsx(19,24): error TS2552: Cannot find name 'BannerVariant'. Did you mean 'AlertVariant'?
// Let's import BannerVariant into Alert.tsx
alertStr = "import type { BannerVariant } from './Banner';\n" + alertStr;
fs.writeFileSync(path.join(componentsDir, 'Alert.tsx'), alertStr);

// SettingsLayout needs SettingsGroup
// Where is SettingsGroup? It was in SettingsLayout.tsx? Or Wizard.tsx?
// Let's check where SettingsGroup is in the project.
