import { describe, it, expect } from 'vitest';
import {
  BaseModuleRegistry,
  createEventBus,
  type BaseModuleDefinition,
} from '../src/index';

const makeModule = (overrides: Partial<BaseModuleDefinition> = {}): BaseModuleDefinition => ({
  key: 'test-module',
  name: 'Test Module',
  ...overrides,
});

describe('@mawsoftwares/modules — BaseModuleRegistry', () => {
  it('should register a module', () => {
    const registry = new BaseModuleRegistry();
    registry.register(makeModule());
    expect(registry.isRegistered('test-module')).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('should throw on duplicate registration', () => {
    const registry = new BaseModuleRegistry();
    registry.register(makeModule());
    expect(() => registry.register(makeModule())).toThrow('already registered');
  });

  it('should enable a module', async () => {
    const registry = new BaseModuleRegistry();
    registry.register(makeModule());
    await registry.enable('test-module');
    expect(registry.isEnabled('test-module')).toBe(true);
  });

  it('should disable a module', async () => {
    const registry = new BaseModuleRegistry();
    registry.register(makeModule());
    await registry.enable('test-module');
    await registry.disable('test-module');
    expect(registry.isEnabled('test-module')).toBe(false);
    expect(registry.getStatus('test-module')).toBe('disabled');
  });

  it('should prevent disabling a module that is required by an enabled module', async () => {
    const registry = new BaseModuleRegistry();
    registry.register(makeModule({ key: 'base', name: 'Base' }));
    registry.register(
      makeModule({
        key: 'dependent',
        name: 'Dependent',
        dependencies: [{ moduleKey: 'base' }],
      }),
    );
    await registry.enable('base');
    await registry.enable('dependent');
    await expect(registry.disable('base')).rejects.toThrow('required by enabled modules');
  });

  it('should validate dependencies on enable', async () => {
    const registry = new BaseModuleRegistry();
    registry.register(
      makeModule({
        key: 'orphan',
        name: 'Orphan',
        dependencies: [{ moduleKey: 'nonexistent' }],
      }),
    );
    await expect(registry.enable('orphan')).rejects.toThrow('not registered');
  });

  it('should respect optional dependencies', async () => {
    const registry = new BaseModuleRegistry();
    registry.register(
      makeModule({
        key: 'soft-dep',
        name: 'SoftDep',
        dependencies: [{ moduleKey: 'missing', optional: true }],
      }),
    );
    await expect(registry.enable('soft-dep')).resolves.toBeUndefined();
  });

  it('should return all enabled modules', async () => {
    const registry = new BaseModuleRegistry();
    registry.register(makeModule({ key: 'a', name: 'A' }));
    registry.register(makeModule({ key: 'b', name: 'B' }));
    await registry.enable('a');
    const enabled = registry.getEnabled();
    expect(enabled.length).toBe(1);
    expect(enabled[0]!.key).toBe('a');
  });

  it('should compute init order respecting dependencies', () => {
    const registry = new BaseModuleRegistry();
    registry.register(makeModule({ key: 'c', name: 'C', dependencies: [{ moduleKey: 'b' }] }));
    registry.register(makeModule({ key: 'b', name: 'B', dependencies: [{ moduleKey: 'a' }] }));
    registry.register(makeModule({ key: 'a', name: 'A' }));
    const order = registry.getInitOrder();
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('should configure a module and validate required fields', () => {
    const registry = new BaseModuleRegistry();
    registry.register(
      makeModule({
        config: {
          fields: [{ key: 'apiKey', type: 'string', required: true }],
        },
      }),
    );
    expect(() => registry.configure('test-module', {})).toThrow('required field');
    expect(() =>
      registry.configure('test-module', { apiKey: 'abc123' }),
    ).not.toThrow();
  });
});

describe('@mawsoftwares/modules — EventBus', () => {
  it('should emit and receive events', async () => {
    const bus = createEventBus();
    const received: string[] = [];
    bus.on<string>('test', (payload) => received.push(payload));
    await bus.emit('test', 'hello');
    expect(received).toEqual(['hello']);
  });

  it('should support once listeners', async () => {
    const bus = createEventBus();
    let count = 0;
    bus.once('test', () => count++);
    await bus.emit('test', null);
    await bus.emit('test', null);
    expect(count).toBe(1);
  });

  it('should clear listeners', async () => {
    const bus = createEventBus();
    let count = 0;
    bus.on('test', () => count++);
    bus.clear('test');
    await bus.emit('test', null);
    expect(count).toBe(0);
  });
});
