import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkgs = ['ui-contract', 'sdk', 'rbac-core', 'api-client', 'theme', 'layout', 'page-templates', 'ui-web'];
const alias = pkgs.flatMap((p) => [
  { find: new RegExp(`^@mawsoftwares/${p}$`), replacement: fileURLToPath(new URL(`../../${p}/src/index.ts`, import.meta.url)) },
  { find: new RegExp(`^@mawsoftwares/${p}/(.*)$`), replacement: fileURLToPath(new URL(`../../${p}/src/$1`, import.meta.url)) },
]);

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: { alias },
});
