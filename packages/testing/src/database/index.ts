export async function getTestPool() {
  const { createTestPool } = await import('@mawsoftwares/database/testing');
  return await createTestPool();
}

export async function getMockPgPool() {
  const { MockPgPool } = await import('@mawsoftwares/database/testing');
  return new MockPgPool();
}

export async function withCleanDatabase(tables: string[], fn: () => Promise<void>): Promise<void> {
  const { createTestPool, truncateTables } = await import('@mawsoftwares/database/testing');
  const pool = await createTestPool();
  await truncateTables(pool, tables);
  await fn();
}

export async function createSeededPool(seedFn: (pool: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<void>) {
  const { createTestPool } = await import('@mawsoftwares/database/testing');
  const pool = await createTestPool();
  await seedFn(pool);
  return pool;
}
