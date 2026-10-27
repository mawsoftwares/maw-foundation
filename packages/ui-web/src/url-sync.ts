import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

/** Keeps the browser address bar in step with the active page (History API, no router dependency). */

export interface PagePathEntry {
  key: string;
  path: string | null | undefined;
}

export interface PageMatch {
  /** Resolved page key. */
  page: string;
  /** Decoded path segments after the page's own path, e.g. `/users/42/edit` on `/users` -> `['42', 'edit']`. */
  subPath: string[];
}

const DEFAULT_PAGE = 'dashboard';
const URL_CHANGE_EVENT = 'maw:urlchange';

function normalizeBase(base: string): string {
  return base.replace(/\/+$/, '');
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** App-relative path of a location pathname, with the deploy base (VITE_BASE_PATH) removed. */
export function stripBase(pathname: string, base: string): string {
  const b = normalizeBase(base);
  if (b !== '' && (pathname === b || pathname.startsWith(`${b}/`))) return pathname.slice(b.length) || '/';
  return pathname;
}

/**
 * Resolves a URL pathname to a page and its inner path. An exact menu path wins, then the longest menu path that
 * is a segment-wise prefix (`/users/42` -> `users` + `['42']`); an unknown path falls back to its last segment
 * (so a deep link still resolves before the menu tree has loaded); `/` is the dashboard.
 */
export function matchPagePath(pathname: string, base: string, entries: PagePathEntry[]): PageMatch {
  const rel = stripBase(pathname, base).replace(/\/+$/, '') || '/';
  if (rel === '/') return { page: DEFAULT_PAGE, subPath: [] };
  const exact = entries.find((e) => e.path === rel);
  if (exact) return { page: exact.key, subPath: [] };
  let best: PagePathEntry | undefined;
  for (const e of entries) {
    if (!e.path || e.path === '/' || !rel.startsWith(`${e.path}/`)) continue;
    if (best === undefined || (best.path ?? '').length < e.path.length) best = e;
  }
  if (best?.path) {
    return { page: best.key, subPath: rel.slice(best.path.length).split('/').filter(Boolean).map(safeDecode) };
  }
  return { page: rel.split('/').filter(Boolean).pop() ?? DEFAULT_PAGE, subPath: [] };
}

/** Page key for a URL pathname (see {@link matchPagePath}). */
export function pageFromPathname(pathname: string, base: string, entries: PagePathEntry[]): string {
  return matchPagePath(pathname, base, entries).page;
}

/** URL pathname (including the deploy base) for a page key: its menu path, else `/<key>`. */
export function pathnameForPage(page: string, base: string, entries: PagePathEntry[]): string {
  const hit = entries.find((e) => e.key === page && e.path);
  const rel = hit?.path ?? `/${page}`;
  return `${normalizeBase(base)}${rel.startsWith('/') ? rel : `/${rel}`}`;
}

function writeUrl(url: string, replace: boolean): void {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
  window.dispatchEvent(new Event(URL_CHANGE_EVENT));
}

function subscribeUrl(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(URL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(URL_CHANGE_EVENT, onChange);
  };
}

const urlSnapshot = (): string => `${window.location.pathname}${window.location.search}`;
const serverUrlSnapshot = (): string => '';

export interface UseUrlSyncedPageOptions {
  /** Active page key. */
  page: string;
  /** Called with the page key resolved from the URL on back/forward and when `entries` change. */
  setPage: (page: string) => void;
  /** Known page keys and their paths (e.g. the flattened menu tree). */
  entries: PagePathEntry[];
  /** Deploy base path, e.g. `import.meta.env.BASE_URL`. */
  base: string;
  /** Sync only while true (e.g. once signed in); defaults to true. */
  enabled?: boolean;
}

/**
 * Pushes the page's URL when the page changes (replacing on the root URL), follows back/forward, and re-resolves
 * the page from the URL once `entries` (the menu tree) arrive. An inner path such as `/users/42` is left alone
 * while the page stays `users`.
 */
export function useUrlSyncedPage({ page, setPage, entries, base, enabled = true }: UseUrlSyncedPageOptions): void {
  const pageRef = useRef(page);
  const syncedPage = useRef<string | undefined>(undefined);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // The menu tree loads after first paint, so re-resolve a deep link against it.
  useEffect(() => {
    const next = pageFromPathname(window.location.pathname, base, entries);
    if (next !== pageRef.current) setPage(next);
  }, [entries, base, setPage]);

  useEffect(() => {
    if (!enabled || syncedPage.current === page) return;
    syncedPage.current = page;
    const atRoot = stripBase(window.location.pathname, base) === '/';
    if (!atRoot && pageFromPathname(window.location.pathname, base, entries) === page) return;
    const search = atRoot ? window.location.search : '';
    writeUrl(`${pathnameForPage(page, base, entries)}${search}`, atRoot);
  }, [page, enabled, base, entries]);

  useEffect(() => {
    const onPopState = (): void => setPage(pageFromPathname(window.location.pathname, base, entries));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setPage, base, entries]);
}

export interface SetSubPathOptions {
  /** Replace the current history entry instead of adding one. */
  replace?: boolean;
}

export interface PageSubPath {
  /** Decoded inner path segments of `page`, e.g. `['42']` on `/users/42`; empty when the URL is on another page. */
  segments: string[];
  /** Navigates to `<page path>/<segments…>`, keeping the query string. */
  setSegments: (segments: string[], options?: SetSubPathOptions) => void;
}

/** Reads and writes the inner path of a page (`/users/42`), re-rendering on push, replace and back/forward. */
export function usePageSubPath(page: string, base: string, entries: PagePathEntry[]): PageSubPath {
  const url = useSyncExternalStore(subscribeUrl, urlSnapshot, serverUrlSnapshot);
  const segments = useMemo(() => {
    const match = matchPagePath(url.split('?')[0] ?? '', base, entries);
    return match.page === page ? match.subPath : [];
  }, [url, page, base, entries]);
  const setSegments = useCallback(
    (next: string[], options?: SetSubPathOptions): void => {
      const tail = next.map(encodeURIComponent).join('/');
      const root = pathnameForPage(page, base, entries);
      writeUrl(`${root}${tail === '' ? '' : `/${tail}`}${window.location.search}`, options?.replace === true);
    },
    [page, base, entries],
  );
  return { segments, setSegments };
}

/** Query-string updates: a `null`, `undefined` or empty value removes the key. */
export type SearchParamUpdates = Record<string, string | null | undefined>;

/** Merges `updates` into `current` and returns the new query string (with leading `?`, or empty). */
export function applySearchParams(current: string, updates: SearchParamUpdates): string {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
}

/** Reads and updates the URL query string (filters, search, pagination), re-rendering on every URL change. */
export function useSearchParams(): [URLSearchParams, (updates: SearchParamUpdates, options?: SetSubPathOptions) => void] {
  const url = useSyncExternalStore(subscribeUrl, urlSnapshot, serverUrlSnapshot);
  const params = useMemo(() => new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?')) : ''), [url]);
  const setParams = useCallback((updates: SearchParamUpdates, options?: SetSubPathOptions): void => {
    const { pathname, search, hash } = window.location;
    writeUrl(`${pathname}${applySearchParams(search, updates)}${hash}`, options?.replace === true);
  }, []);
  return [params, setParams];
}
