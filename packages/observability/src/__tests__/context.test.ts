import { describe, it, expect } from 'vitest';
import { runWithContext, getContext, getContextOrEmpty } from '../context/store';
import type { ObservabilityContext } from '../context/types';

describe('ObservabilityContext', () => {
  it('getContext returns undefined outside runWithContext', () => {
    expect(getContext()).toBeUndefined();
  });

  it('getContextOrEmpty returns empty object outside runWithContext', () => {
    const ctx = getContextOrEmpty();
    expect(ctx).toEqual({});
  });

  it('runWithContext stores and retrieves context', () => {
    const ctx: ObservabilityContext = {
      requestId: 'req-1',
      correlationId: 'cor-1',
      tenantId: 'tenant-1',
    };

    runWithContext(ctx, () => {
      const stored = getContext();
      expect(stored).toBeDefined();
      expect(stored!.requestId).toBe('req-1');
      expect(stored!.correlationId).toBe('cor-1');
      expect(stored!.tenantId).toBe('tenant-1');
    });
  });

  it('nested runWithContext overrides context', () => {
    const outer: ObservabilityContext = { requestId: 'outer', correlationId: 'outer-cor' };
    const inner: ObservabilityContext = { requestId: 'inner', correlationId: 'inner-cor' };

    runWithContext(outer, () => {
      expect(getContext()!.requestId).toBe('outer');
      runWithContext(inner, () => {
        expect(getContext()!.requestId).toBe('inner');
      });
      expect(getContext()!.requestId).toBe('outer');
    });
  });

  it('propagates across async boundaries', async () => {
    const ctx: ObservabilityContext = { requestId: 'async-req', correlationId: 'async-cor' };

    await runWithContext(ctx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(getContext()!.requestId).toBe('async-req');
    });
  });

  it('returns sync value from runWithContext', () => {
    const ctx: ObservabilityContext = { requestId: 'r', correlationId: 'c' };
    const result = runWithContext(ctx, () => 42);
    expect(result).toBe(42);
  });

  it('returns async value from runWithContext', async () => {
    const ctx: ObservabilityContext = { requestId: 'r', correlationId: 'c' };
    const result = await runWithContext(ctx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return 'done';
    });
    expect(result).toBe('done');
  });
});
