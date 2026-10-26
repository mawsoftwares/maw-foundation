import { useEffect } from 'react';

/** Keeps the browser address bar in step with the active page (History API, no router dependency). */

export interface PagePathEntry {
  key: string;
  path: string | null | undefined;
}

const DEFAULT_PAGE = 'dashboard';

function normalizeBase(base: string): string {
  return base.replace(/\/+$/, '');
}

/** App-relative path of a location pathname, with the deploy base (VITE_BASE_PATH) removed. */
export function stripBase(pathname: string, base: string): string {
  const b = normalizeBase(base);
  if (b !== '' && (pathname === b || pathname.startsWith(`${b}/`))) return pathname.slice(b.length) || '/';
  return pathname;
}

/** Page key for a URL pathname: a known menu path wins, otherwise the last segment; `/` is the dashboard. */
export function pageFromPathname(pathname: string, base: string, entries: PagePathEntry[]): string {
  const rel = stripBase(pathname, base).replace(/\/+$/, '') || '/';
  if (rel === '/') return DEFAULT_PAGE;
  const hit = entries.find((e) => e.path === rel);
  return hit?.key ?? rel.split('/').filter(Boolean).pop() ?? DEFAULT_PAGE;
}

/** URL pathname (including the deploy base) for a page key: its menu path, else `/<key>`. */
export function pathnameForPage(page: string, base: string, entries: PagePathEntry[]): string {
  const hit = entries.find((e) => e.key === page && e.path);
  const rel = hit?.path ?? `/${page}`;
  return `${normalizeBase(base)}${rel.startsWith('/') ? rel : `/${rel}`}`;
}

export interface UseUrlSyncedPageOptions {
  /** Active page key. */
  page: string;
  /** Called with the page key resolved from the URL on back/forward. */
  setPage: (page: string) => void;
  /** Known page keys and their paths (e.g. the flattened menu tree). */
  entries: PagePathEntry[];
  /** Deploy base path, e.g. `import.meta.env.BASE_URL`. */
  base: string;
  /** Sync only while true (e.g. once signed in); defaults to true. */
  enabled?: boolean;
}

/** Pushes the page's URL when it changes (replacing on the root URL) and follows back/forward navigation. */
export function useUrlSyncedPage({ page, setPage, entries, base, enabled = true }: UseUrlSyncedPageOptions): void {
  useEffect(() => {
    if (!enabled) return;
    const target = pathnameForPage(page, base, entries);
    if (window.location.pathname === target) return;
    const atRoot = stripBase(window.location.pathname, base) === '/';
    window.history[atRoot ? 'replaceState' : 'pushState']({}, '', `${target}${window.location.search}`);
  }, [page, enabled, base, entries]);

  useEffect(() => {
    const onPopState = (): void => setPage(pageFromPathname(window.location.pathname, base, entries));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setPage, base, entries]);
}
