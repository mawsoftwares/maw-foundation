/**
 * Typed environment/config utilities — isomorphic (works on Node, browser, RN).
 */

// ---------------------------------------------------------------------------
// Environment access
// ---------------------------------------------------------------------------

export function getEnv(key: string, fallback?: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] ?? fallback;
  }
  return fallback;
}

export function getRequiredEnv(key: string): string {
  const value = getEnv(key);
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnvInt(key: string, fallback: number): number {
  const raw = getEnv(key);
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  if (isNaN(n)) throw new Error(`Environment variable ${key} must be an integer, got "${raw}"`);
  return n;
}

export function getEnvBool(key: string, fallback: boolean): boolean {
  const raw = getEnv(key);
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes';
}

// ---------------------------------------------------------------------------
// Typed config loader
// ---------------------------------------------------------------------------

export interface ConfigSchema<T> {
  [key: string]: {
    env: string;
    required?: boolean;
    default?: T[keyof T];
    parse?: (value: string) => T[keyof T];
  };
}

export function loadTypedConfig<T extends Record<string, unknown>>(
  schema: ConfigSchema<T>,
): T {
  const config = {} as Record<string, unknown>;

  for (const [key, spec] of Object.entries(schema)) {
    const raw = getEnv(spec.env);

    if (raw === undefined || raw === '') {
      if (spec.required && spec.default === undefined) {
        throw new Error(`Missing required config: ${spec.env}`);
      }
      config[key] = spec.default;
    } else {
      config[key] = spec.parse ? spec.parse(raw) : raw;
    }
  }

  return config as T;
}

// ---------------------------------------------------------------------------
// Runtime detection
// ---------------------------------------------------------------------------

export function isServer(): boolean {
  return typeof window === 'undefined';
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isReactNative(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  );
}

export type Runtime = 'server' | 'browser' | 'react-native';

export function detectRuntime(): Runtime {
  if (isReactNative()) return 'react-native';
  if (isBrowser()) return 'browser';
  return 'server';
}
