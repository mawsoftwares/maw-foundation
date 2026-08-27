import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrandProvider, I18nProvider, ToastProvider } from '@mawsoftwares/ui-web';
import * as i18n from '@mawsoftwares/sdk/i18n/index';
import { AUTH_EN_MESSAGES } from '@mawsoftwares/ui-auth';
import { App } from './App';
import { staticBrandProvider, DEFAULT_TENANT } from './brand-setup';

i18n.registerLocale('en', {
  ...AUTH_EN_MESSAGES,
  'common.delete': 'Delete',
  'common.search': 'Search...',
  'common.noData': 'No data found',
  'common.confirm': 'Are you sure?',
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
  'auth.createAccount': 'खाता बनाएं',
  'auth.forgotPassword': 'पासवर्ड भूल गए?',
  'auth.haveVerificationToken': 'मेरे पास सत्यापन कोड है',
  'auth.backToLogin': 'लॉगिन पर वापस जाएं',
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
  'common.loading': 'लोड होत आहे...',
  'auth.login': 'साइन इन',
  'auth.logout': 'लॉग आउट',
  'auth.email': 'ईमेल',
  'auth.password': 'पासवर्ड',
  'auth.createAccount': 'खाते तयार करा',
  'auth.forgotPassword': 'पासवर्ड विसरलात?',
  'auth.haveVerificationToken': 'माझ्याकडे पडताळणी कोड आहे',
  'auth.backToLogin': 'लॉगिनवर परत जा',
  'nav.dashboard': 'डॅशबोर्ड',
  'nav.orders': 'ऑर्डर',
  'dashboard.welcome': 'पुन्हा स्वागत, {name}',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandProvider
      tenantId={DEFAULT_TENANT}
      provider={staticBrandProvider}
      loadingFallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#666' }}>Loading brand...</div>}
    >
      <I18nProvider defaultLocale="en">
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </BrandProvider>
  </StrictMode>,
);
