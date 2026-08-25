export type ApiVersion = 'v1' | 'v2';

export const CURRENT_API_VERSION: ApiVersion = 'v1';

export const API_PREFIX = `/api/${CURRENT_API_VERSION}` as const;

export function versionedPath(path: string, version: ApiVersion = CURRENT_API_VERSION): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/api/${version}${normalized}`;
}
