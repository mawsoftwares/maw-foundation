import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrandProvider, I18nProvider, ToastProvider } from '@mawsoftwares/ui-web';
import * as i18n from '@mawsoftwares/sdk/i18n';
import { AUTH_EN_MESSAGES } from '@mawsoftwares/ui-auth';
import { Provider } from 'react-redux';
import { App } from './App';
import { staticBrandProvider, DEFAULT_TENANT } from './brand-setup';
import { store } from './store';

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
  'nav.dashboard': 'डैशबोर्ड',
  'nav.orders': 'ऑर्डर',
  'dashboard.welcome': 'वापसी पर स्वागत है, {name}',
  'dashboard.totalOrders': 'कुल ऑर्डर',
  'dashboard.revenue': 'आय',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrandProvider
        tenantId={DEFAULT_TENANT}
        provider={staticBrandProvider}
        loadingFallback={
          <div className="maw-auth-screen" style={{ color: 'var(--maw-fgMuted)' }}>
            Loading...
          </div>
        }
      >
        <I18nProvider defaultLocale="en">
          <ToastProvider>
            <App />
          </ToastProvider>
        </I18nProvider>
      </BrandProvider>
    </Provider>
  </StrictMode>,
);
