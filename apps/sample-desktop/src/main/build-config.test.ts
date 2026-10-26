import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards the three things that once made `electron-vite build` / `dev` / `preview` fail for this app, none of which a typecheck
 * or unit test catches:
 *  1. the config file name (electron-vite silently uses defaults — output in out/, no aliases or plugins — if it isn't found),
 *  2. importing the type-only `electron-vite/node` at runtime,
 *  3. the preload file name main loads (a `"type": "module"` package gets an `.mjs` preload).
 */
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string): string => readFileSync(join(root, rel), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) return sourceFiles(rel);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [rel] : [];
  });
}

describe('sample-desktop electron-vite setup', () => {
  const pkg = JSON.parse(read('package.json')) as { main: string; type?: string; scripts: Record<string, string> };
  it("names the config the way electron-vite auto-discovers it (electron.vite.config.*, with a dot)", () => {
    expect(existsSync(join(root, 'electron.vite.config.ts'))).toBe(true);
    const strays = readdirSync(root).filter((f) => /^electron-vite\.config\./.test(f));
    expect(strays, 'electron-vite does not discover electron-vite.config.* (hyphen); it would build with defaults').toEqual([]);
  });

  it("builds where package.json's main and electron-builder expect it (dist/)", () => {
    expect(pkg.main).toBe('dist/main/index.js');
    const config = read('electron.vite.config.ts');
    expect(config).toContain("outDir: 'dist/main'");
    expect(config).toContain("outDir: 'dist/preload'");
    expect(config).toContain("'dist/renderer'");
    expect(read('electron-builder.yml')).toContain('dist/**/*');
  });

  it('wires the macOS afterSign hook, and the script it names exists', () => {
    const builder = read('electron-builder.yml');
    const hook = /^afterSign:\s*(\S+)\s*$/m.exec(builder)?.[1];
    expect(hook, 'electron-builder.yml must set afterSign').toBeDefined();
    expect(existsSync(join(root, hook!)), `afterSign script ${hook} must exist`).toBe(true);
  });

  it('offers a universal (arm64 + x64) macOS build alongside the fast host-arch one', () => {
    expect(pkg.scripts['dist:mac:universal']).toBe('electron-builder --mac --universal');
    expect(pkg.scripts['dist:mac'], 'the quick host-arch build should stay separate').toBe('electron-builder --mac');
  });

  it('loads the preload with the extension electron-vite emits for this package type', () => {
    const preloadName = pkg.type === 'module' ? 'index.mjs' : 'index.js';
    expect(read('src/main/index.ts')).toContain(`'../preload/${preloadName}'`);
  });

  it("never imports 'electron-vite/node' (its ./node export is types-only, so it fails to build and typecheck)", () => {
    for (const file of [...sourceFiles('src/main'), ...sourceFiles('src/preload')]) {
      expect(read(file), file).not.toMatch(/from\s+['"]electron-vite\/node['"]/);
    }
  });
});
