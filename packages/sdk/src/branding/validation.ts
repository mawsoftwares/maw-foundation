import type { BrandConfig, BrandColorConfig, BrandLogoConfig } from './types';
import { DEFAULT_BRAND_CONFIG } from './defaults';

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGBA_COLOR = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*[\d.]+)?\s*\)$/;
const HSL_COLOR = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?(\s*,\s*[\d.]+)?\s*\)$/;

const VALID_MODES = ['light', 'dark', 'system'] as const;
const VALID_DENSITIES = ['compact', 'normal', 'comfortable'] as const;

export interface BrandValidationError {
  readonly field: string;
  readonly message: string;
}

function isValidColor(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return HEX_COLOR.test(value) || RGBA_COLOR.test(value) || HSL_COLOR.test(value);
}

function isValidUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.startsWith('/')) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isSafeString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return !/<script/i.test(value) && !/javascript:/i.test(value) && !/on\w+\s*=/i.test(value);
}

export function validateBrandConfig(config: unknown): BrandValidationError[] {
  const errors: BrandValidationError[] = [];

  if (!config || typeof config !== 'object') {
    errors.push({ field: 'root', message: 'BrandConfig must be an object' });
    return errors;
  }

  const c = config as Record<string, unknown>;

  if (typeof c['tenantId'] !== 'string' || c['tenantId'] === '') {
    errors.push({ field: 'tenantId', message: 'tenantId is required' });
  }

  if (typeof c['name'] !== 'string' || c['name'] === '') {
    errors.push({ field: 'name', message: 'name is required' });
  }

  if (!c['logo'] || typeof c['logo'] !== 'object') {
    errors.push({ field: 'logo', message: 'logo configuration is required' });
  } else {
    const logo = c['logo'] as Record<string, unknown>;
    if (!isValidUrl(logo['light'])) {
      errors.push({ field: 'logo.light', message: 'logo.light must be a valid URL or path' });
    }
    if (logo['dark'] !== undefined && !isValidUrl(logo['dark'])) {
      errors.push({ field: 'logo.dark', message: 'logo.dark must be a valid URL or path' });
    }
  }

  if (!c['colors'] || typeof c['colors'] !== 'object') {
    errors.push({ field: 'colors', message: 'colors configuration is required' });
  } else {
    const colors = c['colors'] as Record<string, unknown>;
    if (!isValidColor(colors['primary'])) {
      errors.push({ field: 'colors.primary', message: 'colors.primary must be a valid color' });
    }
    const optionalColorKeys = ['secondary', 'accent', 'success', 'warning', 'error', 'background', 'surface', 'text', 'textMuted', 'border'];
    for (const key of optionalColorKeys) {
      if (colors[key] !== undefined && !isValidColor(colors[key])) {
        errors.push({ field: `colors.${key}`, message: `colors.${key} must be a valid color` });
      }
    }
  }

  if (c['typography'] !== undefined) {
    if (typeof c['typography'] !== 'object' || c['typography'] === null) {
      errors.push({ field: 'typography', message: 'typography must be an object' });
    } else {
      const typo = c['typography'] as Record<string, unknown>;
      if (typo['fontFamily'] !== undefined && !isSafeString(typo['fontFamily'])) {
        errors.push({ field: 'typography.fontFamily', message: 'typography.fontFamily contains unsafe content' });
      }
      if (typo['headingFontFamily'] !== undefined && !isSafeString(typo['headingFontFamily'])) {
        errors.push({ field: 'typography.headingFontFamily', message: 'typography.headingFontFamily contains unsafe content' });
      }
    }
  }

  if (c['theme'] !== undefined) {
    if (typeof c['theme'] !== 'object' || c['theme'] === null) {
      errors.push({ field: 'theme', message: 'theme must be an object' });
    } else {
      const theme = c['theme'] as Record<string, unknown>;
      if (theme['mode'] !== undefined && !(VALID_MODES as readonly string[]).includes(theme['mode'] as string)) {
        errors.push({ field: 'theme.mode', message: 'theme.mode must be light, dark, or system' });
      }
      if (theme['radius'] !== undefined && (typeof theme['radius'] !== 'number' || theme['radius'] < 0 || theme['radius'] > 32)) {
        errors.push({ field: 'theme.radius', message: 'theme.radius must be a number between 0 and 32' });
      }
      if (theme['density'] !== undefined && !(VALID_DENSITIES as readonly string[]).includes(theme['density'] as string)) {
        errors.push({ field: 'theme.density', message: 'theme.density must be compact, normal, or comfortable' });
      }
    }
  }

  if (c['favicon'] !== undefined && !isValidUrl(c['favicon'])) {
    errors.push({ field: 'favicon', message: 'favicon must be a valid URL or path' });
  }

  return errors;
}

export function normalizeBrandConfig(config: Partial<BrandConfig> & { tenantId: string; name: string }): BrandConfig {
  const defaults = DEFAULT_BRAND_CONFIG;

  const logo: BrandLogoConfig = {
    light: config.logo?.light ?? defaults.logo.light,
    ...(config.logo?.dark !== undefined && { dark: config.logo.dark }),
    ...(config.logo?.small !== undefined && { small: config.logo.small }),
    ...(config.logo?.login !== undefined && { login: config.logo.login }),
    ...(config.logo?.email !== undefined && { email: config.logo.email }),
    ...(config.logo?.mobile !== undefined && { mobile: config.logo.mobile }),
  };

  const colors: BrandColorConfig = {
    primary: config.colors?.primary ?? defaults.colors.primary,
    ...(config.colors?.secondary !== undefined && { secondary: config.colors.secondary }),
    ...(config.colors?.accent !== undefined && { accent: config.colors.accent }),
    ...(config.colors?.success !== undefined && { success: config.colors.success }),
    ...(config.colors?.warning !== undefined && { warning: config.colors.warning }),
    ...(config.colors?.error !== undefined && { error: config.colors.error }),
    ...(config.colors?.background !== undefined && { background: config.colors.background }),
    ...(config.colors?.surface !== undefined && { surface: config.colors.surface }),
    ...(config.colors?.text !== undefined && { text: config.colors.text }),
    ...(config.colors?.textMuted !== undefined && { textMuted: config.colors.textMuted }),
    ...(config.colors?.border !== undefined && { border: config.colors.border }),
  };

  return {
    id: config.id ?? `brand-${config.tenantId}`,
    tenantId: config.tenantId,
    version: config.version ?? 1,
    updatedAt: config.updatedAt,
    name: config.name,
    shortName: config.shortName,
    logo,
    favicon: config.favicon ?? defaults.favicon,
    colors,
    typography: config.typography ?? defaults.typography,
    theme: {
      mode: config.theme?.mode ?? defaults.theme!.mode,
      radius: config.theme?.radius ?? defaults.theme!.radius,
      density: config.theme?.density ?? defaults.theme!.density,
    },
    customTokens: config.customTokens,
  };
}
