import { fileURLToPath } from 'node:url';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE: electron-vite only auto-discovers `electron.vite.config.*` (a dot, not a hyphen). With any other name it silently falls
// back to defaults: output in out/ instead of dist/, and none of the aliases or plugins below.

/**
 * UI kit switch. `VITE_UI_KIT=tailwind` swaps `@mawsoftwares/ui-web` for the Tailwind/shadcn kit (the components it implements) while
 * everything else still comes from ui-web. Default: `web`. The entry is shared with sample-web (apps/shared/ui-kit).
 */
const UI_KIT = process.env.VITE_UI_KIT === 'tailwind' ? 'tailwind' : 'web';

const src = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

const pkgs = ['ui-contract', 'sdk', 'rbac-core', 'api-client', 'theme', 'ui-auth', 'api', 'platform', 'import-export', 'ui-web-tailwind'];
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

async function kitPlugins(): Promise<PluginOption[]> {
  if (UI_KIT !== 'tailwind') return [];
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  return [tailwindcss()];
}

export default defineConfig(async () => ({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: fileURLToPath(new URL('src/main/index.ts', import.meta.url)),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: fileURLToPath(new URL('src/preload/index.ts', import.meta.url)),
      },
    },
  },
  renderer: {
    plugins: [react(), ...(await kitPlugins())],
    root: fileURLToPath(new URL('src/renderer', import.meta.url)),
    build: {
      outDir: fileURLToPath(new URL('dist/renderer', import.meta.url)),
      rollupOptions: {
        input: fileURLToPath(new URL('src/renderer/index.html', import.meta.url)),
      },
    },
    resolve: { alias },
    optimizeDeps: {
      exclude: ['@mawsoftwares/database', '@mawsoftwares/api'],
    },
  },
}));
