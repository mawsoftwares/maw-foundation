import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkgs = ['sdk', 'rbac-core', 'api-client', 'theme', 'ui-web'];
const alias = pkgs.flatMap((p) => [
  { find: new RegExp(`^@maw/${p}$`), replacement: fileURLToPath(new URL(`../../packages/${p}/src/index.ts`, import.meta.url)) },
  { find: new RegExp(`^@maw/${p}/(.*)$`), replacement: fileURLToPath(new URL(`../../packages/${p}/src/$1`, import.meta.url)) },
]);

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  server: { port: 5173 },
});
