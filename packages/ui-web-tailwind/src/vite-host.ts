/**
 * Vite helpers for an integrated host (plug-and-play frontends). Node-only: import from
 * `@mawsoftwares/ui-web-tailwind/vite` in `vite.config.ts`, never from app code.
 *
 * Linked module apps import their own app-level singletons (`../api`, `../config`, ...). In a host there
 * must be exactly one API client, one config context, one users API and one set of page paths, so each
 * of those files inside a module's `src/` is redirected to the host's counterpart.
 */

/** App-level files (relative to `src/`, no extension) a host replaces with its own copy. */
export const DEFAULT_HOST_SINGLETONS: readonly string[] = [
  'api',
  'config',
  'config-context',
  'page-paths',
  'features/users/usersApi',
  'store/apiBaseQuery',
];

/** Packages that must resolve to one copy so React context and store state are shared. */
export const HOST_DEDUPE: readonly string[] = [
  'react',
  'react-dom',
  'react-redux',
  '@reduxjs/toolkit',
  '@mawsoftwares/ui-web',
  '@mawsoftwares/ui-contract',
  '@mawsoftwares/api-client',
  '@mawsoftwares/sdk',
  '@mawsoftwares/rbac-core',
  '@mawsoftwares/theme',
];

export interface MawHostOptions {
  /** Absolute path of the host app's `src` directory. */
  readonly hostSrc: string;
  /** Absolute paths of the linked module apps' `src` directories. */
  readonly moduleSrcDirs: readonly string[];
  /** Overrides {@link DEFAULT_HOST_SINGLETONS}. */
  readonly singletons?: readonly string[];
}

interface ResolveContext {
  resolve(source: string, importer: string | undefined, options: { skipSelf: boolean }): Promise<{ readonly id: string } | null>;
}

/** Structurally compatible with a Vite plugin; Foundation does not depend on Vite. */
export interface MawHostPlugin {
  readonly name: string;
  readonly enforce: 'pre';
  resolveId(this: ResolveContext, source: string, importer: string | undefined): Promise<string | null>;
}

/** Redirects the module apps' singleton files to the host's. Files are matched by resolved path. */
export function mawHostSingletons(options: MawHostOptions): MawHostPlugin {
  const names = options.singletons ?? DEFAULT_HOST_SINGLETONS;
  const redirects = new Map<string, string>();
  for (const dir of options.moduleSrcDirs) {
    for (const name of names) {
      for (const ext of ['.ts', '.tsx']) redirects.set(`${dir}/${name}${ext}`, `${options.hostSrc}/${name}${ext}`);
    }
  }
  return {
    name: 'maw-host-singletons',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (importer === undefined || !source.startsWith('.')) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      return resolved === null ? null : (redirects.get(resolved.id) ?? null);
    },
  };
}

/** Directories the dev server must be allowed to read: the host plus every linked module app (they live outside its root). */
export function mawHostFsAllow(options: MawHostOptions): string[] {
  return [`${options.hostSrc}/..`, ...options.moduleSrcDirs.map((d) => `${d}/..`)];
}
