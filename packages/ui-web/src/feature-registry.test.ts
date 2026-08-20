import { describe, it, expect } from 'vitest';
import { FeatureRegistry } from './feature-registry';

function DummyPanel(): null {
  return null;
}

describe('FeatureRegistry', () => {
  it('registers unique keys and looks them up', () => {
    const registry = new FeatureRegistry();
    registry.register({ key: 'reports', name: 'Reports', permissions: ['Read_Reports'], Panel: DummyPanel });
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getByKey('reports')?.name).toBe('Reports');
  });

  it('rejects a duplicate key', () => {
    const registry = new FeatureRegistry();
    registry.register({ key: 'orders', name: 'Orders', Panel: DummyPanel });
    expect(() => registry.register({ key: 'orders', name: 'Orders 2', Panel: DummyPanel })).toThrow(
      /already registered/,
    );
  });
});
