import type { BrandConfig } from './types';

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  id: 'maw-default',
  tenantId: 'default',
  version: 1,
  name: 'MAW Foundation',
  shortName: 'MAW',
  logo: {
    light: '/assets/logo-light.svg',
    dark: '/assets/logo-dark.svg',
    small: '/assets/logo-small.svg',
  },
  favicon: '/favicon.ico',
  colors: {
    primary: '#4f46e5',
    secondary: '#818cf8',
    accent: '#6366f1',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    background: '#ffffff',
    surface: '#f5f6f8',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
  },
  typography: {
    fontFamily: 'Geist Variable',
  },
  theme: {
    mode: 'system',
    radius: 8,
    density: 'normal',
  },
};
