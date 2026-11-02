import { describe, it, expect } from 'vitest';
import type { MawModule } from './contract';
import { collectRoleGrants } from './grants';

const mod = (key: string, roleGrants?: Record<string, string[]>): MawModule => ({
  definition: { key, name: key, version: '1.0.0', routePrefix: `/api/${key}` },
  ...(roleGrants !== undefined ? { roleGrants } : {}),
});

describe('collectRoleGrants', () => {
  it('is empty when no module declares grants', () => {
    expect(collectRoleGrants([mod('a'), mod('b')])).toEqual({});
  });

  it('merges roles across modules without duplicates', () => {
    const grants = collectRoleGrants([
      mod('a', { manager: ['Read_A', 'Update_A'], clerk: ['Read_A'] }),
      mod('b', { manager: ['Read_B', 'Read_A'] }),
    ]);
    expect(grants).toEqual({ manager: ['Read_A', 'Update_A', 'Read_B'], clerk: ['Read_A'] });
  });
});
