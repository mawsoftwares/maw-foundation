import type { ReactNode } from 'react';
import type { NavItem } from './navigation';

/**
 * Plug-and-play module host: the frontend half of the module contract.
 * `key` and `version` mirror the backend `MawModuleDefinition` (same key as in `GET /modules`);
 * navigation reuses `NavItem`. Only the page components are new, because the SDK's cross-platform
 * descriptor lists screen names, not React components.
 */
export interface FrontendModule {
  readonly key: string;
  readonly version: string;
  /** Sidebar entries this module contributes (merged with the DB-driven menu tree). */
  readonly nav: readonly NavItem[];
  /** Page key -> permission required to view it. */
  readonly pagePermissions: Readonly<Record<string, string>>;
  /** Page key -> renderer. A module owns exactly the page keys listed here. */
  readonly pages: Readonly<Record<string, () => ReactNode>>;
}

/** The part of a Redux store a module may use after the host (or its own app) has created it. */
export interface ModuleStore {
  getState(): unknown;
  dispatch(action: { readonly type: string }): unknown;
  subscribe(listener: () => void): () => void;
}

/**
 * State half of a module (Redux slices and middleware its pages rely on). Kept apart from
 * `FrontendModule` so a host can build its store from it without importing any views.
 * Foundation does not depend on Redux: the app instantiates `TReducer`/`TMiddleware` with the
 * Redux Toolkit `Reducer` and `Middleware` types it already uses.
 */
export interface FrontendModuleState<TReducer = unknown, TMiddleware = unknown> {
  readonly reducers: Readonly<Record<string, TReducer>>;
  readonly middleware: readonly TMiddleware[];
  /** Called once with the finished store: for modules that persist slices or bridge store access. */
  readonly onStoreReady?: (store: ModuleStore) => void;
}

/** A module entry as returned by `GET /modules` (the catalog carries more fields than are needed here). */
export interface ModuleCatalogEntry {
  readonly key: string;
  readonly status?: unknown;
}

/**
 * Keys of modules the backend reports as `disabled`. A module missing from the catalog (older backend,
 * catalog not loaded yet) counts as active, so behavior is unchanged unless a module is switched off.
 */
export function disabledModuleKeys(catalog: readonly ModuleCatalogEntry[]): ReadonlySet<string> {
  return new Set(catalog.filter((e) => e.status === 'disabled').map((e) => e.key));
}

export function moduleOfPage(modules: readonly FrontendModule[], page: string): FrontendModule | undefined {
  return modules.find((m) => Object.prototype.hasOwnProperty.call(m.pages, page));
}

/** Nav keys (a module's nav entries and its page keys, e.g. DB-driven menu items) hidden because the module is disabled. */
export function hiddenNavKeys(modules: readonly FrontendModule[], disabled: ReadonlySet<string>): ReadonlySet<string> {
  return new Set(modules.filter((m) => disabled.has(m.key)).flatMap((m) => [...m.nav.map((n) => n.key), ...Object.keys(m.pages)]));
}

export function modulePermissions(modules: readonly FrontendModule[]): Readonly<Record<string, string>> {
  return Object.assign({}, ...modules.map((m) => m.pagePermissions));
}

/** Throws on duplicate module keys or a page key claimed by two modules. */
export function assertConsistent(modules: readonly FrontendModule[]): void {
  const seen = new Map<string, string>();
  for (const m of modules) {
    if (seen.has(`module:${m.key}`)) throw new Error(`Duplicate frontend module "${m.key}"`);
    seen.set(`module:${m.key}`, m.key);
    for (const page of Object.keys(m.pages)) {
      const owner = seen.get(`page:${page}`);
      if (owner !== undefined) throw new Error(`Page "${page}" is declared by both "${owner}" and "${m.key}"`);
      seen.set(`page:${page}`, m.key);
    }
  }
}

/** Throws when two modules (or a module and `reserved`, e.g. the host's own slices) register the same state key. */
export function assertStateConsistent(states: readonly FrontendModuleState[], reserved: readonly string[] = []): void {
  const seen = new Set(reserved);
  for (const state of states) {
    for (const key of Object.keys(state.reducers)) {
      if (seen.has(key)) throw new Error(`Redux state key "${key}" is registered more than once`);
      seen.add(key);
    }
  }
}
