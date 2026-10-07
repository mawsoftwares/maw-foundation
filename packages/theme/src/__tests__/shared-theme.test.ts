import { describe, it, expect } from 'vitest';
import { createSharedThemeClient, type ThemeRequest } from '../shared-theme';

function fakeServer() {
  let stored: string | null = null;
  const calls: { path: string; method: string }[] = [];
  const request: ThemeRequest = async <T>(path: string, init?: { method?: string; body?: string }) => {
    const method = init?.method ?? 'GET';
    calls.push({ path, method });
    if (method === 'PUT') stored = (JSON.parse(init!.body!) as { designMd: string }).designMd + '\n# canonical';
    if (method === 'DELETE') stored = null;
    return { data: stored === null ? null : { designMd: stored } } as T;
  };
  return { request, calls };
}

describe('shared theme client', () => {
  it('loads null when nothing is set, then what an admin saved, then null after reset', async () => {
    const { request, calls } = fakeServer();
    const theme = createSharedThemeClient(request);

    expect(await theme.load()).toBeNull();
    expect(await theme.save('# my theme')).toBe('# my theme\n# canonical');
    expect(await theme.load()).toBe('# my theme\n# canonical');
    await theme.reset();
    expect(await theme.load()).toBeNull();
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /api/v1/theme', 'PUT /api/v1/theme', 'GET /api/v1/theme', 'DELETE /api/v1/theme', 'GET /api/v1/theme',
    ]);
  });
});
