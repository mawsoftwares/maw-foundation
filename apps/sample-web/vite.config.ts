import { fileURLToPath } from 'node:url';
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { HOST_DEDUPE, mawHostFsAllow, mawHostSingletons } from '../../packages/ui-web-tailwind/src/vite-host';

/**
 * UI kit switch. `VITE_UI_KIT=tailwind` swaps `@mawsoftwares/ui-web` for the Tailwind/shadcn kit
 * (components it implements) while everything else still comes from ui-web. Default: `web`.
 */
const UI_KIT = process.env.VITE_UI_KIT === 'tailwind' ? 'tailwind' : 'web';

const src = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

const pkgs = ['ui-contract', 'sdk', 'rbac-core', 'api-client', 'theme', 'layout', 'page-templates', 'ui-auth', 'api', 'platform', 'ui-web-tailwind'];
const alias = [
  // package.json "exports" maps ./theme.css to src/styles/theme.css; mirror that before the generic rules.
  { find: '@mawsoftwares/ui-web-tailwind/theme.css', replacement: src('../../packages/ui-web-tailwind/src/styles/theme.css') },
  // Always the real ui-web — the Tailwind kit entry re-exports it.
  { find: /^@mawsoftwares\/ui-web-base$/, replacement: src('../../packages/ui-web/src/index.ts') },
  {
    find: /^@mawsoftwares\/ui-web$/,
    replacement: UI_KIT === 'tailwind' ? src('../shared/ui-kit/tailwind.ts') : src('../../packages/ui-web/src/index.ts'),
  },
  { find: /^@mawsoftwares\/ui-web\/(.*)$/, replacement: src('../../packages/ui-web/src/$1') },
  ...pkgs.flatMap((p) => [
    { find: new RegExp(`^@mawsoftwares/${p}$`), replacement: src(`../../packages/${p}/src/index.ts`) },
    { find: new RegExp(`^@mawsoftwares/${p}/(.*)$`), replacement: src(`../../packages/${p}/src/$1`) },
  ]),
];

/**
 * Integrated host: `MAW_HOST_MODULES=/abs/path/to/moduleA/frontend/src,/abs/path/to/moduleB/frontend/src` plugs those
 * module apps' frontends into this app (see docs/plug-and-play.md). Their app-level singletons (`../api`, `../config`, ...)
 * are redirected to this app's, and React/Redux/Foundation resolve to a single copy.
 */
const hostModuleDirs = (process.env.MAW_HOST_MODULES ?? '').split(',').map((d) => d.trim()).filter((d) => d !== '');
const hostOptions = { hostSrc: src('./src'), moduleSrcDirs: hostModuleDirs };

async function kitPlugins(): Promise<PluginOption[]> {
  if (UI_KIT !== 'tailwind') return [];
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  return [tailwindcss()];
}

export default defineConfig(async () => ({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [...(hostModuleDirs.length > 0 ? [mawHostSingletons(hostOptions)] : []), react(), ...(await kitPlugins())],
  base: process.env.VITE_BASE_PATH || '/',
  resolve: { alias, ...(hostModuleDirs.length > 0 ? { dedupe: [...HOST_DEDUPE] } : {}) },
  server: { port: 5173, ...(hostModuleDirs.length > 0 ? { fs: { allow: [src('../../..'), ...mawHostFsAllow(hostOptions)] } } : {}) },
  optimizeDeps: {
    exclude: ['@mawsoftwares/database', '@mawsoftwares/api'],
  },
}));
