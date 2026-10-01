import { fileURLToPath } from 'node:url';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const pkgs = ['sdk', 'rbac-core', 'api-client', 'theme', 'ui-web', 'ui-auth', 'ui-users', 'api', 'platform', 'import-export'];
const alias = pkgs.flatMap((p) => [
  { find: new RegExp(`^@mawsoftwares/${p}$`), replacement: fileURLToPath(new URL(`../../packages/${p}/src/index.ts`, import.meta.url)) },
  { find: new RegExp(`^@mawsoftwares/${p}/(.*)$`), replacement: fileURLToPath(new URL(`../../packages/${p}/src/$1`, import.meta.url)) },
]);

export default defineConfig({
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
    plugins: [react()],
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
});
