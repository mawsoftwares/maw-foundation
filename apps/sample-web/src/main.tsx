import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, I18nProvider, ToastProvider } from '@maw/ui-web';
import * as i18n from '@maw/sdk/i18n/index';
import { App } from './App';

i18n.registerLocale('en', {
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.search': 'Search...',
  'common.loading': 'Loading...',
  'common.noData': 'No data found',
  'common.confirm': 'Are you sure?',
  'auth.login': 'Sign in',
  'auth.logout': 'Log out',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.invalidCredentials': 'Invalid credentials',
  'nav.dashboard': 'Dashboard',
  'nav.orders': 'Orders',
  'nav.reports': 'Reports',
  'nav.inventory': 'Inventory',
  'nav.billing': 'Billing',
  'nav.users': 'Users',
  'nav.auditLogs': 'Audit Logs',
  'nav.showcase': 'UI Showcase',
  'nav.settings': 'Settings',
  'dashboard.welcome': 'Welcome back, {name}',
  'dashboard.totalOrders': 'Total Orders',
  'dashboard.revenue': 'Revenue',
  'dashboard.activeUsers': 'Active Users',
  'dashboard.pendingBills': 'Pending Bills',
});

i18n.registerLocale('hi', {
  'common.save': 'सहेजें',
  'common.cancel': 'रद्द करें',
  'common.delete': 'हटाएं',
  'common.search': 'खोजें...',
  'common.loading': 'लोड हो रहा है...',
  'auth.login': 'साइन इन',
  'auth.logout': 'लॉग आउट',
  'auth.email': 'ईमेल',
  'auth.password': 'पासवर्ड',
  'nav.dashboard': 'डैशबोर्ड',
  'nav.orders': 'ऑर्डर',
  'nav.reports': 'रिपोर्ट',
  'nav.settings': 'सेटिंग्स',
  'dashboard.welcome': 'वापसी पर स्वागत है, {name}',
  'dashboard.totalOrders': 'कुल ऑर्डर',
  'dashboard.revenue': 'आय',
});

i18n.registerLocale('mr', {
  'common.save': 'जतन करा',
  'common.cancel': 'रद्द करा',
  'common.delete': 'काढून टाका',
  'common.search': 'शोधा...',
  'auth.login': 'साइन इन',
  'auth.logout': 'लॉग आउट',
  'nav.dashboard': 'डॅशबोर्ड',
  'nav.orders': 'ऑर्डर',
  'dashboard.welcome': 'पुन्हा स्वागत, {name}',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider defaultLocale="en">
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
);
