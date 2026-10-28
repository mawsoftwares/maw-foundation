import { resolveProjectUi, type ProjectUiConfig, type ProjectUiState, type ProjectUiStore } from '@mawsoftwares/layout';
import { client } from './api';
import { translateLayoutError } from './layout-errors';
import { projectThemeRegistry } from './project-themes';

/**
 * The project's draft/published UI configuration, stored on the server (/api/v1/layout, tenant_layout) so a published
 * layout reaches every user and survives reloads and redeployments. Layout Studio talks to the `ProjectUiStore` port;
 * the shell reads only the PUBLISHED config.
 */
const PATH = '/api/v1/layout';

export const knownThemeIds: ReadonlySet<string> = new Set(projectThemeRegistry.ids());

interface Envelope<T> {
  readonly data: T;
}

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  try {
    const res = await client.request<Envelope<T>>(`${PATH}${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return res.data;
  } catch (e) {
    return translateLayoutError(e);
  }
}

export const projectUiStore: ProjectUiStore = {
  load: () => call<ProjectUiState>('/studio'),
  saveDraft: (config) => call<ProjectUiState>('/draft', 'PUT', config),
  discardDraft: () => call<ProjectUiState>('/draft', 'DELETE'),
  publish: () => call<ProjectUiState>('/publish', 'POST'),
  rollback: (revision) => call<ProjectUiState>('/rollback', 'POST', { revision }),
};

export const PROJECT_UI_PUBLISHED_EVENT = 'maw:project-ui-published';

/** The live config for the signed-in tenant (any signed-in user may read it); `null` = nothing published yet. */
export async function loadPublishedUi(): Promise<ProjectUiConfig | null> {
  const res = await call<{ published: ProjectUiConfig | null }>('/');
  return res.published;
}

/** First-paint cache only (like the shared theme's): the server stays the source of truth. Keyed by tenant. */
const cacheKey = (tenantId: string): string => `maw-project-ui-published:${tenantId}`;

export function readCachedPublishedUi(tenantId: string): ProjectUiConfig | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(tenantId));
    return raw === null ? null : (JSON.parse(raw) as ProjectUiConfig);
  } catch {
    return null;
  }
}

export function writeCachedPublishedUi(tenantId: string, config: ProjectUiConfig | null): void {
  try {
    if (config === null) window.localStorage.removeItem(cacheKey(tenantId));
    else window.localStorage.setItem(cacheKey(tenantId), JSON.stringify(config));
  } catch {
    // Storage unavailable: just no first-paint cache.
  }
}

/** Never throws; unusable stored config degrades to the classic shell (see resolveProjectUi). */
export const resolvePublishedUi = (config: ProjectUiConfig | null) => resolveProjectUi(config, undefined, knownThemeIds);

/**
 * Preview before publishing: the Studio's working copy (saved or not) is applied to the real application for THIS tab only.
 * Nothing is sent to the server, so no one else sees it; closing the tab or exiting the preview ends it.
 */
export const PROJECT_UI_PREVIEW_EVENT = 'maw:project-ui-preview';
const PREVIEW_KEY = 'maw-project-ui-preview';

export function readPreviewUi(): ProjectUiConfig | null {
  try {
    const raw = window.sessionStorage.getItem(PREVIEW_KEY);
    return raw === null ? null : (JSON.parse(raw) as ProjectUiConfig);
  } catch {
    return null;
  }
}

function setPreviewUi(config: ProjectUiConfig | null): void {
  try {
    if (config === null) window.sessionStorage.removeItem(PREVIEW_KEY);
    else window.sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(config));
  } catch {
    // Storage unavailable: the preview still applies through the event below, it just won't survive a reload.
  }
  window.dispatchEvent(new CustomEvent(PROJECT_UI_PREVIEW_EVENT, { detail: config }));
}

export const startPreviewUi = (config: ProjectUiConfig): void => setPreviewUi(config);
export const stopPreviewUi = (): void => setPreviewUi(null);
