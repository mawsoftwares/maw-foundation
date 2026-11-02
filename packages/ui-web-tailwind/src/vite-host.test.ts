import { describe, it, expect } from 'vitest';
import { mawHostFsAllow, mawHostSingletons } from './vite-host';

const options = { hostSrc: '/host/src', moduleSrcDirs: ['/mod/a/src'] };
const ctx = (id: string | null) => ({ resolve: async () => (id === null ? null : { id }) });

describe('mawHostSingletons', () => {
  it('redirects a module singleton to the host copy', async () => {
    const plugin = mawHostSingletons(options);
    expect(await plugin.resolveId.call(ctx('/mod/a/src/api.ts'), './api', '/mod/a/src/features/x.ts')).toBe('/host/src/api.ts');
    expect(await plugin.resolveId.call(ctx('/mod/a/src/features/users/usersApi.ts'), '../users/usersApi', '/mod/a/src/x.ts')).toBe('/host/src/features/users/usersApi.ts');
  });

  it('leaves other files, bare imports and the host itself alone', async () => {
    const plugin = mawHostSingletons(options);
    expect(await plugin.resolveId.call(ctx('/mod/a/src/other.ts'), './other', '/mod/a/src/x.ts')).toBeNull();
    expect(await plugin.resolveId.call(ctx('/host/src/api.ts'), './api', '/host/src/x.ts')).toBeNull();
    expect(await plugin.resolveId.call(ctx(null), 'react', '/mod/a/src/x.ts')).toBeNull();
    expect(await plugin.resolveId.call(ctx(null), './missing', '/mod/a/src/x.ts')).toBeNull();
  });
});

describe('mawHostFsAllow', () => {
  it('allows the host and module roots', () => {
    expect(mawHostFsAllow(options)).toEqual(['/host/src/..', '/mod/a/src/..']);
  });
});
