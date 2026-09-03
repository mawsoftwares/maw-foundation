import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkgs = ['sdk', 'rbac-core', 'api-client', 'theme', 'ui-web', 'ui-auth', 'ui-users', 'masters', 'api'];
const alias = pkgs.flatMap((p) => [
  { find: new RegExp(`^@mawsoftwares/${p}$`), replacement: fileURLToPath(new URL(`../../packages/${p}/src/index.ts`, import.meta.url)) },
  { find: new RegExp(`^@mawsoftwares/${p}/(.*)$`), replacement: fileURLToPath(new URL(`../../packages/${p}/src/$1`, import.meta.url)) },
]);

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  resolve: { alias },
  server: { port: 5173 },
  optimizeDeps: {
    exclude: ['@mawsoftwares/masters', '@mawsoftwares/database', '@mawsoftwares/api'],
  },
});
