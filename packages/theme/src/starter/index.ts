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
  label: 'Medical Blue',
  description: 'Calm trust-blue sidebar. Clinics, health and service apps.',
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
  label: 'Violet Studio',
  description: 'Rich violet with soft cards. Creative and listing products.',
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
  label: 'Midnight Rose',
  description: 'Dark navy rail with a rose accent. Social and chat apps.',
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
  label: 'Clean Light',
  description: 'Airy white chrome. Neutral, content-first.',
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

/** Deep indigo sidebar with a translucent-white active item and a cyan accent: the "modern dark sidebar" SaaS look. */
export const auroraTheme: ThemeDefinition = {
  id: 'aurora',
  label: 'Aurora',
  description: 'Deep indigo sidebar with a cyan glow. Modern SaaS.',
  overrides: {
    palette: {
      brand: '#5b5bf0', brandLight: '#8b8bf7', brandDark: '#4141c9', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#f6f7fd', bgSubtle: '#eff0fb',
      fg: '#141633', fgMuted: '#555a7e', fgSubtle: '#868bab', border: '#e3e5f6', borderFocus: '#5b5bf0',
    },
    paletteDark: {
      brand: '#8b8bf7', brandLight: '#adadfa', brandDark: '#6b6bf2', brandContrast: '#0a0b1f',
      bg: '#12132b', bgMuted: '#191b38', bgSubtle: '#0c0d20', fg: '#eff0fc', fgMuted: '#a6aacb', border: '#272a4d',
    },
    radius: { sm: 8, md: 12, lg: 18, xl: 28 },
    shadows: SOFT_SHADOWS,
    shell: { bg: '#14163a', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.82)', border: 'rgba(255, 255, 255, 0.10)', hover: 'rgba(255, 255, 255, 0.10)' },
    components: {
      'nav-item': { textColor: 'rgba(255, 255, 255, 0.9)' },
      'nav-item-hover': { backgroundColor: 'rgba(255, 255, 255, 0.10)', textColor: '#ffffff' },
      'nav-item-active': { backgroundColor: '#5b5bf0', textColor: '#ffffff' },
    },
    extraTokens: { 'shell-logo': '#9fe3ff', ...LIGHT_HEADER('#e3e5f6', '#141633') },
  },
};

/** Flat, hairline and tight-radiused (Linear / Vercel style): neutral greys, no shadows, a near-black accent. */
export const slateMinimalTheme: ThemeDefinition = {
  id: 'slate-minimal',
  label: 'Slate Minimal',
  description: 'Flat, hairline and precise. Developer tools.',
  overrides: {
    palette: {
      brand: '#18181b', brandLight: '#52525b', brandDark: '#09090b', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#fafafa', bgSubtle: '#f4f4f5',
      fg: '#18181b', fgMuted: '#52525b', fgSubtle: '#71717a', border: '#e4e4e7', borderFocus: '#18181b',
    },
    paletteDark: {
      brand: '#fafafa', brandLight: '#e4e4e7', brandDark: '#d4d4d8', brandContrast: '#09090b',
      bg: '#0f0f11', bgMuted: '#18181b', bgSubtle: '#09090b', fg: '#fafafa', fgMuted: '#a1a1aa', border: '#27272a',
    },
    radius: { sm: 4, md: 6, lg: 8, xl: 12 },
    shadows: { sm: 'none', md: '0 1px 2px rgba(0, 0, 0, 0.05)', lg: '0 8px 24px rgba(0, 0, 0, 0.08)' },
    shell: { bg: '#fafafa', fg: '#18181b', fgMuted: '#52525b', border: '#e4e4e7', hover: '#f0f0f2' },
    components: {
      'nav-item-active': { backgroundColor: '#e9e9ec', textColor: '#18181b' },
    },
    extraTokens: { 'shell-logo': '#18181b' },
  },
};

/** Deep green sidebar with a white active pill and a fresh emerald accent. */
export const emeraldFreshTheme: ThemeDefinition = {
  id: 'emerald-fresh',
  label: 'Emerald Fresh',
  description: 'Deep green with a fresh accent. Finance and growth.',
  overrides: {
    palette: {
      brand: '#087a5d', brandLight: '#3fc09c', brandDark: '#065c46', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#f4faf8', bgSubtle: '#ecf6f2',
      fg: '#10241f', fgMuted: '#51655f', fgSubtle: '#80938d', border: '#dcebe6', borderFocus: '#087a5d',
    },
    paletteDark: {
      brand: '#4fd1a9', brandLight: '#7fe0c1', brandDark: '#2fb58c', brandContrast: '#04140f',
      bg: '#10201b', bgMuted: '#172a24', bgSubtle: '#0a1613', fg: '#ecf7f3', fgMuted: '#9fb8b0', border: '#223a32',
    },
    radius: SOFT_RADIUS,
    shadows: SOFT_SHADOWS,
    shell: { bg: '#0d3b30', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.9)', border: 'rgba(255, 255, 255, 0.16)', hover: 'rgba(255, 255, 255, 0.12)' },
    components: colouredSidebarItems('#0d3b30'),
    extraTokens: { 'shell-logo': '#6ee7c0', ...LIGHT_HEADER('#dcebe6', '#10241f') },
  },
};

/** Deep teal sidebar with a bright cyan highlight: oceanic, calm, data-friendly. */
export const oceanTealTheme: ThemeDefinition = {
  id: 'ocean-teal',
  label: 'Ocean Teal',
  description: 'Deep teal with a cyan highlight. Analytics and logistics.',
  overrides: {
    palette: {
      brand: '#0e7490', brandLight: '#38b6d2', brandDark: '#0a5870', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#f3fafc', bgSubtle: '#eaf6f9',
      fg: '#0c2630', fgMuted: '#4a6670', fgSubtle: '#7b979f', border: '#d8ebf0', borderFocus: '#0e7490',
    },
    paletteDark: {
      brand: '#4fd1e8', brandLight: '#7fe0f0', brandDark: '#22b8d3', brandContrast: '#031a21',
      bg: '#0e2229', bgMuted: '#142d36', bgSubtle: '#091a1f', fg: '#e8f7fa', fgMuted: '#9dbcc5', border: '#1f3d47',
    },
    radius: SOFT_RADIUS,
    shadows: SOFT_SHADOWS,
    shell: { bg: '#083344', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.88)', border: 'rgba(255, 255, 255, 0.14)', hover: 'rgba(255, 255, 255, 0.12)' },
    components: {
      'nav-item': { textColor: 'rgba(255, 255, 255, 0.92)' },
      'nav-item-hover': { backgroundColor: 'rgba(255, 255, 255, 0.12)', textColor: '#ffffff' },
      'nav-item-active': { backgroundColor: '#22d3ee', textColor: '#042f3b' },
    },
    extraTokens: { 'shell-logo': '#67e8f9', ...LIGHT_HEADER('#d8ebf0', '#0c2630') },
  },
};

/** Warm orange sidebar with a white active pill: friendly, energetic, retail and food. */
export const sunsetCoralTheme: ThemeDefinition = {
  id: 'sunset-coral',
  label: 'Sunset Coral',
  description: 'Warm coral-orange and cream. Retail, food and lifestyle.',
  overrides: {
    palette: {
      brand: '#c2410c', brandLight: '#ee7a45', brandDark: '#9a3412', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#fffaf5', bgSubtle: '#fdf3ea',
      fg: '#2a1a12', fgMuted: '#6b5547', fgSubtle: '#9c8576', border: '#f4e4d6', borderFocus: '#c2410c',
    },
    paletteDark: {
      brand: '#fb923c', brandLight: '#fdba74', brandDark: '#ea7a1f', brandContrast: '#1c0d03',
      bg: '#231812', bgMuted: '#2d1f17', bgSubtle: '#160f0b', fg: '#fbf1e8', fgMuted: '#bda899', border: '#3d2c21',
    },
    radius: { sm: 10, md: 14, lg: 20, xl: 28 },
    shadows: SOFT_SHADOWS,
    shell: { bg: '#c2410c', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.92)', border: 'rgba(255, 255, 255, 0.2)', hover: 'rgba(255, 255, 255, 0.14)' },
    components: colouredSidebarItems('#c2410c'),
    extraTokens: { 'shell-logo': '#ffffff', ...LIGHT_HEADER('#f4e4d6', '#2a1a12') },
  },
};

/** Near-black graphite sidebar with a lime accent: the focused "developer tool" look. */
export const graphiteTheme: ThemeDefinition = {
  id: 'graphite',
  label: 'Graphite',
  description: 'Near-black chrome with a lime accent. Dev and ops tools.',
  overrides: {
    palette: {
      brand: '#4d7c0f', brandLight: '#84cc16', brandDark: '#3f6212', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#fafaf9', bgSubtle: '#f4f4f2',
      fg: '#1c1c1a', fgMuted: '#54544f', fgSubtle: '#80807a', border: '#e5e5e1', borderFocus: '#4d7c0f',
    },
    paletteDark: {
      brand: '#a3e635', brandLight: '#bef264', brandDark: '#84cc16', brandContrast: '#0a0f02',
      bg: '#131311', bgMuted: '#1b1b18', bgSubtle: '#0c0c0b', fg: '#f5f5f2', fgMuted: '#a8a8a0', border: '#2a2a26',
    },
    radius: { sm: 5, md: 8, lg: 12, xl: 16 },
    shadows: { sm: 'none', md: '0 1px 3px rgba(0, 0, 0, 0.08)', lg: '0 10px 30px rgba(0, 0, 0, 0.16)' },
    shell: { bg: '#141412', fg: '#f5f5f2', fgMuted: 'rgba(245, 245, 242, 0.78)', border: 'rgba(255, 255, 255, 0.09)', hover: 'rgba(255, 255, 255, 0.08)' },
    components: {
      'nav-item': { textColor: 'rgba(245, 245, 242, 0.9)' },
      'nav-item-hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)', textColor: '#ffffff' },
      'nav-item-active': { backgroundColor: '#2a2a26', textColor: '#bef264' },
    },
    extraTokens: { 'shell-logo': '#a3e635', ...LIGHT_HEADER('#e5e5e1', '#1c1c1a') },
  },
};

/** Pale lavender sidebar, big rounded corners and a solid violet active item: soft, friendly, consumer-facing. */
export const lavenderSoftTheme: ThemeDefinition = {
  id: 'lavender-soft',
  label: 'Lavender Soft',
  description: 'Pastel lavender with generous curves. Consumer and wellness.',
  overrides: {
    palette: {
      brand: '#6d4fd8', brandLight: '#9f86ee', brandDark: '#5638b5', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#faf8ff', bgSubtle: '#f4f0fd',
      fg: '#251c4a', fgMuted: '#5f5886', fgSubtle: '#8f89b0', border: '#e9e3f8', borderFocus: '#6d4fd8',
    },
    paletteDark: {
      brand: '#a78bfa', brandLight: '#c4b5fd', brandDark: '#8b6df0', brandContrast: '#120a30',
      bg: '#1a1530', bgMuted: '#221c3d', bgSubtle: '#110d22', fg: '#f3f0fd', fgMuted: '#b2abd2', border: '#30295a',
    },
    radius: { sm: 12, md: 16, lg: 22, xl: 32 },
    shadows: {
      sm: '0 1px 2px rgba(80, 60, 160, 0.06)',
      md: '0 6px 18px rgba(80, 60, 160, 0.10)',
      lg: '0 18px 40px rgba(80, 60, 160, 0.16)',
    },
    shell: { bg: '#f1edfd', fg: '#251c4a', fgMuted: '#5f5886', border: '#e1daf6', hover: '#e7e0fa' },
    components: {
      'nav-item-active': { backgroundColor: '#6d4fd8', textColor: '#ffffff' },
    },
    extraTokens: { 'shell-logo': '#6d4fd8', ...LIGHT_HEADER('#e9e3f8', '#251c4a') },
  },
};

/** Navy sidebar with a gold active item and tight corners: premium, trustworthy, finance and legal. */
export const royalNavyTheme: ThemeDefinition = {
  id: 'royal-navy',
  label: 'Royal Navy',
  description: 'Navy and gold with crisp corners. Banking, legal, enterprise.',
  overrides: {
    palette: {
      brand: '#1e3a8a', brandLight: '#4d6ac4', brandDark: '#162c6b', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#f8f9fc', bgSubtle: '#f1f3f9',
      fg: '#10182f', fgMuted: '#4e5877', fgSubtle: '#7d86a3', border: '#e1e5f0', borderFocus: '#1e3a8a',
    },
    paletteDark: {
      brand: '#e8b84a', brandLight: '#f2cf7d', brandDark: '#d49f2c', brandContrast: '#1a1202',
      bg: '#101730', bgMuted: '#162040', bgSubtle: '#0a0f22', fg: '#eef1fa', fgMuted: '#a1abcb', border: '#26325c',
    },
    radius: { sm: 3, md: 6, lg: 10, xl: 14 },
    shadows: { sm: '0 1px 2px rgba(16, 24, 47, 0.08)', md: '0 4px 12px rgba(16, 24, 47, 0.10)', lg: '0 14px 32px rgba(16, 24, 47, 0.16)' },
    shell: { bg: '#0f1d3a', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.84)', border: 'rgba(255, 255, 255, 0.12)', hover: 'rgba(255, 255, 255, 0.10)' },
    components: {
      'nav-item': { textColor: 'rgba(255, 255, 255, 0.92)' },
      'nav-item-hover': { backgroundColor: 'rgba(255, 255, 255, 0.10)', textColor: '#ffffff' },
      'nav-item-active': { backgroundColor: '#e8b84a', textColor: '#0f1d3a' },
    },
    extraTokens: { 'shell-logo': '#e8b84a', ...LIGHT_HEADER('#e1e5f0', '#10182f') },
  },
};

/** Deep indigo-violet sidebar with white text; pairs with the `tab` active item (job boards, marketplaces). */
export const deepVioletTheme: ThemeDefinition = {
  id: 'deep-violet',
  label: 'Deep Violet',
  description: 'Rich indigo-violet with a white tab. Job boards and marketplaces.',
  overrides: {
    palette: {
      brand: '#4a2cc2', brandLight: '#8468ec', brandDark: '#37209a', brandContrast: '#ffffff',
      bg: '#ffffff', bgMuted: '#f8f7fd', bgSubtle: '#f4f2fc',
      fg: '#1d1740', fgMuted: '#5a5580', fgSubtle: '#8c88ad', border: '#e8e5f6', borderFocus: '#4a2cc2',
    },
    paletteDark: {
      brand: '#9a84f5', brandLight: '#b7a7f8', brandDark: '#7a5fe8', brandContrast: '#0f0a29',
      bg: '#17122f', bgMuted: '#1f1940', bgSubtle: '#0f0b22', fg: '#f1eefc', fgMuted: '#aca6d0', border: '#2c2557',
    },
    radius: { sm: 8, md: 12, lg: 16, xl: 22 },
    shadows: SOFT_SHADOWS,
    shell: { bg: '#3b1ea1', fg: '#ffffff', fgMuted: 'rgba(255, 255, 255, 0.88)', border: 'rgba(255, 255, 255, 0.14)', hover: 'rgba(255, 255, 255, 0.10)' },
    components: {
      'nav-item': { textColor: 'rgba(255, 255, 255, 0.92)' },
      'nav-item-hover': { backgroundColor: 'rgba(255, 255, 255, 0.10)', textColor: '#ffffff' },
      'nav-item-active': { backgroundColor: '#ffffff', textColor: '#1d1740' },
    },
    extraTokens: { 'shell-logo': '#ffffff', ...LIGHT_HEADER('#e8e5f6', '#1d1740') },
  },
};

/** All starter themes, in gallery order. */
export const starterThemes: readonly ThemeDefinition[] = [medicalBlueTheme, violetStudioTheme, midnightRoseTheme, cleanLightTheme, auroraTheme, slateMinimalTheme, emeraldFreshTheme, oceanTealTheme, sunsetCoralTheme, graphiteTheme, lavenderSoftTheme, royalNavyTheme, deepVioletTheme];
