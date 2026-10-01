import type { IBrandConfigProvider, BrandConfig } from '@mawsoftwares/sdk';

const BRANDS: Record<string, BrandConfig> = {
  'client-a': {
    id: 'brand-client-a',
    tenantId: 'client-a',
    version: 1,
    name: 'Blue Corp',
    shortName: 'Blue',
    logo: { light: '/assets/logo-light.svg', dark: '/assets/logo-dark.svg' },
    favicon: '/favicon.ico',
    colors: {
      primary: '#1565C0',
      secondary: '#42A5F5',
      accent: '#0D47A1',
      success: '#2E7D32',
      warning: '#F57F17',
      error: '#C62828',
      background: '#FFFFFF',
      surface: '#F5F7FA',
      text: '#1A1A2E',
      textMuted: '#5C6B7A',
      border: '#E0E6ED',
    },
    typography: { fontFamily: 'Inter' },
    theme: { mode: 'light', radius: 8, density: 'normal' },
  },
};

export const staticBrandProvider: IBrandConfigProvider = {
  async load(tenantId: string): Promise<BrandConfig | null> {
    return BRANDS[tenantId] ?? null;
  },
};

export const AVAILABLE_TENANTS = Object.keys(BRANDS);
export const DEFAULT_TENANT = 'client-a';
