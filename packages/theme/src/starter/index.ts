import type { ThemeDefinition, ThemeOverrides } from '../index';

/**
 * Ready-made themes — pure data for the Theme Engine, usable with any layout. They carry colour, radius, shadow and
 * the sidebar/active-item styling; the SHAPE of the chrome (inset card, pill navigation) belongs to the layout.
 * Register with `createThemeRegistry([...starterThemes])` and pick one by id.
 */

const SOFT_RADIUS = { sm: 8, md: 12, lg: 16, xl: 24 } as const;
const SOFT_SHADOWS = {
  sm: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)',
  md: '0 4px 14px rgba(16, 24, 40, 0.08)',
  lg: '0 14px 34px rgba(16, 24, 40, 0.12)',
} as const;

/** White "pill" for the active item on a coloured sidebar, with legible idle and hover states. */
const colouredSidebarItems = (brand: string): NonNullable<ThemeOverrides['components']> => ({
  'nav-item': { textColor: 'rgba(255, 255, 255, 0.94)' },
  'nav-item-hover': { backgroundColor: 'rgba(255, 255, 255, 0.14)', textColor: '#ffffff' },
  'nav-item-active': { backgroundColor: '#ffffff', textColor: brand },
});

const LIGHT_HEADER = (border: string, fg: string): Record<string, string> => ({
  'shell-header-bg': '#ffffff',
  'shell-header-fg': fg,
  'shell-header-border': border,
});

export const medicalBlueTheme: ThemeDefinition = {
  id: 'medical-blue',
  overrides: {
    palette: {
      brand: '#2f5bd9', brandLight: '#6b8ff5', brandDark: '#2447b0', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#f5f8fe', bgSubtle: '#eef3fc',
      fg: '#1c2540', fgMuted: '#56637f', fgSubtle: '#8793ad', border: '#e1e8f6', borderFocus: '#2f5bd9',
    },
    paletteDark: {
      brand: '#7c9bf5', brandLight: '#a3b9f8', brandDark: '#5b7de0', brandContrast: '#0b1020',
      bg: '#161b2e', bgMuted: '#1d2338', bgSubtle: '#0f1322', fg: '#eef1fb', fgMuted: '#a3adc9', border: '#2a3250',
    },
    radius: SOFT_RADIUS,
    shadows: SOFT_SHADOWS,
    shell: { bg: '#2f5bd9', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.9)', border: 'rgba(255, 255, 255, 0.18)', hover: 'rgba(255, 255, 255, 0.14)' },
    components: colouredSidebarItems('#2f5bd9'),
    extraTokens: { 'shell-logo': '#ffffff', ...LIGHT_HEADER('#e1e8f6', '#1c2540') },
  },
};

export const violetStudioTheme: ThemeDefinition = {
  id: 'violet-studio',
  overrides: {
    palette: {
      brand: '#5b4bd6', brandLight: '#8e82ea', brandDark: '#4536b8', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#f7f6fe', bgSubtle: '#f1effd',
      fg: '#1f1b3a', fgMuted: '#5f5c84', fgSubtle: '#8f8cb0', border: '#e6e3fa', borderFocus: '#5b4bd6',
    },
    paletteDark: {
      brand: '#9a8cf2', brandLight: '#b9aff6', brandDark: '#7b6be0', brandContrast: '#100c28',
      bg: '#17142b', bgMuted: '#1f1b38', bgSubtle: '#100e20', fg: '#f0eefc', fgMuted: '#aaa6cc', border: '#2c2850',
    },
    radius: SOFT_RADIUS,
    shadows: SOFT_SHADOWS,
    shell: { bg: '#5b4bd6', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.9)', border: 'rgba(255, 255, 255, 0.18)', hover: 'rgba(255, 255, 255, 0.14)' },
    components: colouredSidebarItems('#5b4bd6'),
    extraTokens: { 'shell-logo': '#ffffff', ...LIGHT_HEADER('#e6e3fa', '#1f1b3a') },
  },
};

export const midnightRoseTheme: ThemeDefinition = {
  id: 'midnight-rose',
  overrides: {
    palette: {
      brand: '#c8456b', brandLight: '#e0809b', brandDark: '#a3345a', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#faf6f8', bgSubtle: '#f5f1f4',
      fg: '#241b24', fgMuted: '#6a5d69', fgSubtle: '#9a8d99', border: '#ebe3e9', borderFocus: '#c8456b',
    },
    paletteDark: {
      brand: '#e0809b', brandLight: '#eba3b8', brandDark: '#c8456b', brandContrast: '#1a0c13',
      bg: '#1d1a24', bgMuted: '#26222f', bgSubtle: '#14111a', fg: '#f6f1f5', fgMuted: '#b3a8b1', border: '#322d3d',
    },
    radius: SOFT_RADIUS,
    shadows: SOFT_SHADOWS,
    shell: { bg: '#1c1b2e', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.68)', border: 'rgba(255, 255, 255, 0.10)', hover: 'rgba(255, 255, 255, 0.10)' },
    extraTokens: { 'shell-logo': '#ffffff', ...LIGHT_HEADER('#ebe3e9', '#241b24') },
  },
};

export const cleanLightTheme: ThemeDefinition = {
  id: 'clean-light',
  overrides: {
    palette: {
      brand: '#3f5fe0', brandLight: '#7088ee', brandDark: '#2f49b8', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#f8f9fc', bgSubtle: '#f4f6fb',
      fg: '#1b2133', fgMuted: '#586178', fgSubtle: '#8a92a8', border: '#e6e9f2', borderFocus: '#3f5fe0',
    },
    paletteDark: {
      brand: '#869cf0', brandLight: '#a8b8f5', brandDark: '#6580e8', brandContrast: '#0b0f1d',
      bg: '#171a26', bgMuted: '#1e2230', bgSubtle: '#10131d', fg: '#eef0f8', fgMuted: '#a5abc0', border: '#2a2f42',
    },
    radius: { sm: 6, md: 10, lg: 14, xl: 20 },
    shadows: SOFT_SHADOWS,
    shell: { bg: '#ffffff', fg: '#1b2133', fgMuted: '#586178', border: '#e6e9f2', hover: '#f4f6fb' },
  },
};

/** All starter themes, in gallery order. */
export const starterThemes: readonly ThemeDefinition[] = [medicalBlueTheme, violetStudioTheme, midnightRoseTheme, cleanLightTheme];
