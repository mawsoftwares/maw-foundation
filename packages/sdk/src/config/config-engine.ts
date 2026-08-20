/**
 * Multi-level Configuration Engine — the centralized resolver.
 *
 * Layers (lowest to highest priority):
 *   Environment → App → Tenant → Module → User/UI
 *
 * Usage:
 *   const config = createConfigEngine();
 *   config.loadLayer('app', { currency: 'INR', dateFormat: 'DD/MM/YYYY' });
 *   config.loadLayer('tenant', { currency: 'USD' });
 *   config.get('currency')       // → 'USD' (tenant overrides app)
 *   config.get('dateFormat')     // → 'DD/MM/YYYY' (falls through to app)
 *   config.get('billing.invoicePrefix')  // → dot-path deep access
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConfigLayer = 'environment' | 'app' | 'tenant' | 'module' | 'user';

export type ConfigValue = string | number | boolean | null | ConfigObject | ConfigValue[];

export interface ConfigObject {
  [key: string]: ConfigValue;
}

export type ConfigChangeListener = (path: string, value: ConfigValue, layer: ConfigLayer) => void;

export interface ConfigEngine {
  loadLayer(layer: ConfigLayer, values: ConfigObject): void;
  clearLayer(layer: ConfigLayer): void;

  get<T extends ConfigValue = ConfigValue>(path: string): T | undefined;
  get<T extends ConfigValue = ConfigValue>(path: string, fallback: T): T;
  getRequired<T extends ConfigValue = ConfigValue>(path: string): T;

  getString(path: string, fallback?: string): string | undefined;
  getNumber(path: string, fallback?: number): number | undefined;
  getBool(path: string, fallback?: boolean): boolean | undefined;

  has(path: string): boolean;
  resolve(): Readonly<ConfigObject>;
  resolveLayer(layer: ConfigLayer): Readonly<ConfigObject>;

  onChange(listener: ConfigChangeListener): () => void;
}

// ---------------------------------------------------------------------------
// Layer priority (lower index = lower priority)
// ---------------------------------------------------------------------------

const LAYER_ORDER: readonly ConfigLayer[] = [
  'environment',
  'app',
  'tenant',
  'module',
  'user',
];

// ---------------------------------------------------------------------------
// Deep get/set/merge helpers
// ---------------------------------------------------------------------------

function deepGet(obj: ConfigObject, path: string): ConfigValue | undefined {
  const keys = path.split('.');
  let current: ConfigValue = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as ConfigObject)[key] as ConfigValue;
  }
  return current;
}

function deepMerge(target: ConfigObject, source: ConfigObject): ConfigObject {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal as ConfigObject, sourceVal as ConfigObject);
    } else {
      result[key] = sourceVal as ConfigValue;
    }
  }
  return result;
}

function flattenKeys(obj: ConfigObject, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      keys.push(...flattenKeys(val as ConfigObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createConfigEngine(): ConfigEngine {
  const layers = new Map<ConfigLayer, ConfigObject>();
  const listeners = new Set<ConfigChangeListener>();
  let resolved: ConfigObject | null = null;

  function invalidate() {
    resolved = null;
  }

  function buildResolved(): ConfigObject {
    if (resolved !== null) return resolved;
    let merged: ConfigObject = {};
    for (const layer of LAYER_ORDER) {
      const data = layers.get(layer);
      if (data) merged = deepMerge(merged, data);
    }
    resolved = merged;
    return merged;
  }

  function notify(layer: ConfigLayer, values: ConfigObject) {
    if (listeners.size === 0) return;
    const keys = flattenKeys(values);
    for (const path of keys) {
      const value = deepGet(buildResolved(), path);
      for (const fn of listeners) fn(path, value as ConfigValue, layer);
    }
  }

  const engine: ConfigEngine = {
    loadLayer(layer, values) {
      const existing = layers.get(layer);
      const merged = existing ? deepMerge(existing, values) : { ...values };
      layers.set(layer, merged);
      invalidate();
      notify(layer, values);
    },

    clearLayer(layer) {
      layers.delete(layer);
      invalidate();
    },

    get<T extends ConfigValue = ConfigValue>(path: string, fallback?: T): T | undefined {
      const val = deepGet(buildResolved(), path);
      return (val !== undefined ? val : fallback) as T | undefined;
    },

    getRequired<T extends ConfigValue = ConfigValue>(path: string): T {
      const val = deepGet(buildResolved(), path);
      if (val === undefined) {
        throw new Error(`Required config "${path}" is not set`);
      }
      return val as T;
    },

    getString(path, fallback) {
      const val = engine.get(path);
      if (val === undefined) return fallback;
      return String(val);
    },

    getNumber(path, fallback) {
      const val = engine.get(path);
      if (val === undefined) return fallback;
      const n = Number(val);
      return isNaN(n) ? fallback : n;
    },

    getBool(path, fallback) {
      const val = engine.get(path);
      if (val === undefined) return fallback;
      if (typeof val === 'boolean') return val;
      if (val === 'true' || val === '1' || val === 'yes') return true;
      if (val === 'false' || val === '0' || val === 'no') return false;
      return fallback;
    },

    has(path) {
      return deepGet(buildResolved(), path) !== undefined;
    },

    resolve() {
      return buildResolved();
    },

    resolveLayer(layer) {
      return layers.get(layer) ?? {};
    },

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return engine;
}

// ---------------------------------------------------------------------------
// App-level config schema (common defaults every app wants)
// ---------------------------------------------------------------------------

export interface AppConfig {
  appName: string;
  appVersion: string;
  defaultLanguage: string;
  defaultCurrency: string;
  defaultTimezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  supportEmail?: string;
  supportPhone?: string;
  logo?: string;
  favicon?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  appName: 'MAW Application',
  appVersion: '0.1.0',
  defaultLanguage: 'en',
  defaultCurrency: 'INR',
  defaultTimezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: 'HH:mm',
  numberFormat: 'en-IN',
};

// ---------------------------------------------------------------------------
// Tenant config shape
// ---------------------------------------------------------------------------

export interface TenantConfig {
  tenantId: string;
  tenantName: string;
  branding?: {
    logo?: string;
    favicon?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };
  localization?: {
    language?: string;
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
    numberFormat?: string;
  };
  enabledModules?: string[];
  featureFlags?: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// UI config shape
// ---------------------------------------------------------------------------

export interface UIConfig {
  sidebar?: {
    collapsed?: boolean;
    width?: number;
  };
  table?: {
    defaultPageSize?: number;
    enableColumnResize?: boolean;
    enableExport?: boolean;
  };
  pagination?: {
    pageSizeOptions?: number[];
  };
  density?: 'compact' | 'default' | 'comfortable';
}

export const UI_CONFIG_DEFAULTS: UIConfig = {
  sidebar: { collapsed: false, width: 260 },
  table: { defaultPageSize: 25, enableColumnResize: true, enableExport: true },
  pagination: { pageSizeOptions: [10, 25, 50, 100] },
  density: 'default',
};

// ---------------------------------------------------------------------------
// Helper: load tenant config into the engine
// ---------------------------------------------------------------------------

export function applyTenantConfig(engine: ConfigEngine, tenant: TenantConfig): void {
  const layer: ConfigObject = { tenant: {} as ConfigObject };
  const t = layer.tenant as ConfigObject;

  t.id = tenant.tenantId;
  t.name = tenant.tenantName;

  if (tenant.branding) t.branding = tenant.branding as unknown as ConfigObject;
  if (tenant.localization) {
    if (tenant.localization.language) (layer as ConfigObject).defaultLanguage = tenant.localization.language;
    if (tenant.localization.currency) (layer as ConfigObject).defaultCurrency = tenant.localization.currency;
    if (tenant.localization.timezone) (layer as ConfigObject).defaultTimezone = tenant.localization.timezone;
    if (tenant.localization.dateFormat) (layer as ConfigObject).dateFormat = tenant.localization.dateFormat;
    if (tenant.localization.timeFormat) (layer as ConfigObject).timeFormat = tenant.localization.timeFormat;
    if (tenant.localization.numberFormat) (layer as ConfigObject).numberFormat = tenant.localization.numberFormat;
  }
  if (tenant.enabledModules) t.enabledModules = tenant.enabledModules as unknown as ConfigValue;
  if (tenant.featureFlags) t.featureFlags = tenant.featureFlags as unknown as ConfigObject;

  engine.loadLayer('tenant', layer);
}

// ---------------------------------------------------------------------------
// Helper: load module config into the engine
// ---------------------------------------------------------------------------

export function applyModuleConfig(
  engine: ConfigEngine,
  moduleKey: string,
  config: ConfigObject,
): void {
  engine.loadLayer('module', { [moduleKey]: config });
}
