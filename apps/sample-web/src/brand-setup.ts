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
  'client-b': {
    id: 'brand-client-b',
    tenantId: 'client-b',
    version: 1,
    name: 'Green Bistro',
    shortName: 'Green',
    logo: { light: '/assets/logo-light.svg', dark: '/assets/logo-dark.svg' },
    favicon: '/favicon.ico',
    colors: {
      primary: '#2E7D32',
      secondary: '#66BB6A',
      accent: '#1B5E20',
      success: '#1565C0',
      warning: '#E65100',
      error: '#B71C1C',
      background: '#FAFFFE',
      surface: '#F0F7F0',
      text: '#1B2E1B',
      textMuted: '#4E6B4E',
      border: '#C8E6C9',
    },
    typography: { fontFamily: 'Poppins' },
    theme: { mode: 'light', radius: 12, density: 'normal' },
  },
  'client-c': {
    id: 'brand-client-c',
    tenantId: 'client-c',
    version: 1,
    name: 'Purple Cafe',
    shortName: 'Purple',
    logo: { light: '/assets/logo-light.svg', dark: '/assets/logo-dark.svg' },
    favicon: '/favicon.ico',
    colors: {
      primary: '#6A1B9A',
      secondary: '#AB47BC',
      accent: '#4A148C',
      success: '#00695C',
      warning: '#FF8F00',
      error: '#D32F2F',
      background: '#FDFAFF',
      surface: '#F3E5F5',
      text: '#1A0033',
      textMuted: '#6D4C7D',
      border: '#CE93D8',
    },
    typography: { fontFamily: 'DM Sans' },
    theme: { mode: 'system', radius: 16, density: 'comfortable' },
  },
};

export const staticBrandProvider: IBrandConfigProvider = {
  async load(tenantId: string): Promise<BrandConfig | null> {
    await new Promise((r) => setTimeout(r, 300));
    return BRANDS[tenantId] ?? null;
  },
};

export const AVAILABLE_TENANTS = Object.keys(BRANDS);
export const DEFAULT_TENANT = 'client-a';
