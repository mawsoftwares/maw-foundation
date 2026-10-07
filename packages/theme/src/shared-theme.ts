/**
 * Client for the application-wide theme (`/api/v1/theme`). The theme lives on the server, so one admin's change
 * reaches every user; `localStorage` is only a first-paint cache. Framework-free: pass in any `request` that
 * returns the parsed JSON body (e.g. `ApiClient.request`).
 */
export type ThemeRequest = <T>(path: string, init?: { method?: string; body?: string }) => PromiseLike<T>;

interface ThemeEnvelope {
  readonly data: { readonly designMd: string } | null;
}

const PATH = '/api/v1/theme';

export interface SharedThemeClient {
  /** The shared design.md, or `null` when no custom theme is set (use the built-in default). */
  load(): Promise<string | null>;
  /**
   * Same as `load()` but needs no sign-in — for the login page. Omit `tenantId` to use the server's default tenant
   * (the one login itself defaults to).
   */
  loadPublic(tenantId?: string): Promise<string | null>;
  /** Replace the shared theme; resolves to the canonical design.md the server stored. Needs Manage_Theme. */
  save(designMd: string): Promise<string>;
  /** Back to the built-in default for everyone. Needs Manage_Theme. */
  reset(): Promise<void>;
}

export function createSharedThemeClient(request: ThemeRequest): SharedThemeClient {
  return {
    async load() {
      const res = await request<ThemeEnvelope>(PATH);
      return res.data?.designMd ?? null;
    },
    async loadPublic(tenantId) {
      const query = tenantId === undefined ? '' : `?tenantId=${encodeURIComponent(tenantId)}`;
      const res = await request<ThemeEnvelope>(`${PATH}/public${query}`);
      return res.data?.designMd ?? null;
    },
    async save(designMd) {
      const res = await request<ThemeEnvelope>(PATH, { method: 'PUT', body: JSON.stringify({ designMd }) });
      return res.data?.designMd ?? designMd;
    },
    async reset() {
      await request<ThemeEnvelope>(PATH, { method: 'DELETE' });
    },
  };
}
