import { describe, expect, it } from 'vitest';
import { audienceBase, isUnderBase } from './route-bases';

describe('route bases', () => {
  it('prefixes the audience under the deploy base', () => {
    expect(audienceBase('admin', '/')).toBe('/admin');
    expect(audienceBase('admin', '/app/')).toBe('/app/admin');
  });

  it('detects paths under a base without matching look-alikes', () => {
    expect(isUnderBase('/admin', '/admin')).toBe(true);
    expect(isUnderBase('/admin/users', '/admin')).toBe(true);
    expect(isUnderBase('/administrator', '/admin')).toBe(false);
  });
});
