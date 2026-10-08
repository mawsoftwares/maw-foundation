import { describe, it, expect } from 'vitest';
import { isRolledOut } from '@mawsoftwares/sdk';
import {
  DependencyType,
  EvaluationReason,
  FeatureFlagService,
  FeatureRegistry,
  FlagScope,
  FlagState,
  InMemoryFeatureFlagRepository,
  PipelineEvaluator,
  RiskLevel,
  type FeatureDefinition,
  type FeatureOverride,
  type FeatureFlagRepository,
} from '../src/index';

function flag(key: string, overrides: Partial<FeatureDefinition> = {}): FeatureDefinition {
  return { key, name: key, defaultValue: false, isActive: true, failClosed: true, riskLevel: RiskLevel.LOW, ...overrides };
}

const OCR = flag('ocr');
const WHATSAPP = flag('whatsapp');
const ADVANCED_REPORTS = flag('advanced-reports', { defaultValue: true });

const on = (flagKey: string, scope: FlagScope, scopeId?: string): FeatureOverride => ({ flagKey, scope, ...(scopeId === undefined ? {} : { scopeId }), state: FlagState.ON });
const off = (flagKey: string, scope: FlagScope, scopeId?: string): FeatureOverride => ({ flagKey, scope, ...(scopeId === undefined ? {} : { scopeId }), state: FlagState.OFF });

/** The service as an app wires it: the registry knows the flags, the repository holds their configuration. */
function setup(...definitions: FeatureDefinition[]): { svc: FeatureFlagService; repo: InMemoryFeatureFlagRepository; registry: FeatureRegistry } {
  const repo = new InMemoryFeatureFlagRepository();
  const registry = new FeatureRegistry();
  for (const def of definitions) {
    repo.setDefinition(def);
    registry.register(def);
  }
  return { svc: new FeatureFlagService(new PipelineEvaluator(repo), registry), repo, registry };
}

describe('FeatureFlagService', () => {
  it('returns false for unknown flags', async () => {
    const { svc } = setup();
    expect(await svc.isEnabled('nonexistent', {})).toBe(false);
    expect((await svc.evaluate('nonexistent', {})).reason).toBe(EvaluationReason.FLAG_DISABLED);
  });

  it('returns the default value when no overrides exist', async () => {
    const { svc } = setup(OCR, ADVANCED_REPORTS);
    expect(await svc.isEnabled('ocr', {})).toBe(false);
    expect(await svc.isEnabled('advanced-reports', {})).toBe(true);
  });

  it('applies global overrides', async () => {
    const { svc, repo } = setup(OCR);
    repo.setOverrides('ocr', [on('ocr', FlagScope.GLOBAL)]);
    const result = await svc.evaluate('ocr', {});
    expect(result).toMatchObject({ enabled: true, reason: EvaluationReason.GLOBAL_DEFAULT, scope: FlagScope.GLOBAL });
  });

  it('applies tenant-specific overrides', async () => {
    const { svc, repo } = setup(OCR);
    repo.setOverrides('ocr', [on('ocr', FlagScope.GLOBAL), off('ocr', FlagScope.TENANT, 'tenant-b')]);
    expect(await svc.isEnabled('ocr', { tenantId: 'tenant-a' })).toBe(true); // global
    expect(await svc.isEnabled('ocr', { tenantId: 'tenant-b' })).toBe(false); // tenant override
  });

  it('prioritises user > tenant > product > environment > global', async () => {
    const { svc, repo } = setup(WHATSAPP);
    repo.setOverrides('whatsapp', [
      on('whatsapp', FlagScope.GLOBAL),
      off('whatsapp', FlagScope.ENVIRONMENT, 'prod'),
      on('whatsapp', FlagScope.PRODUCT, 'p1'),
      off('whatsapp', FlagScope.TENANT, 't1'),
      on('whatsapp', FlagScope.USER, 'u1'),
    ]);
    const reason = async (ctx: Parameters<typeof svc.evaluate>[1]) => (await svc.evaluate('whatsapp', ctx)).reason;

    expect(await svc.isEnabled('whatsapp', { tenantId: 't1', userId: 'u1' })).toBe(true);
    expect(await reason({ tenantId: 't1', userId: 'u1' })).toBe(EvaluationReason.USER_OVERRIDE);
    expect(await svc.isEnabled('whatsapp', { tenantId: 't1', productId: 'p1' })).toBe(false);
    expect(await reason({ tenantId: 't1', productId: 'p1' })).toBe(EvaluationReason.TENANT_OVERRIDE);
    expect(await reason({ productId: 'p1', environment: 'prod' })).toBe(EvaluationReason.PRODUCT_OVERRIDE);
    expect(await svc.isEnabled('whatsapp', { environment: 'prod' })).toBe(false);
    expect(await reason({ environment: 'prod' })).toBe(EvaluationReason.ENVIRONMENT_OVERRIDE);
    expect(await svc.isEnabled('whatsapp', {})).toBe(true); // global
  });

  it('treats INHERIT as "fall through to the next scope"', async () => {
    const { svc, repo } = setup(OCR);
    repo.setOverrides('ocr', [on('ocr', FlagScope.GLOBAL), { flagKey: 'ocr', scope: FlagScope.TENANT, scopeId: 't1', state: FlagState.INHERIT }]);
    expect(await svc.isEnabled('ocr', { tenantId: 't1' })).toBe(true);
  });

  it('evaluates all registered flags at once', async () => {
    const { svc, repo } = setup(OCR, WHATSAPP, ADVANCED_REPORTS);
    repo.setOverrides('ocr', [on('ocr', FlagScope.GLOBAL)]);
    expect(await svc.getEffectiveFlags({})).toEqual({ ocr: true, whatsapp: false, 'advanced-reports': true });
  });

  it('goes back to the default when overrides are cleared', async () => {
    const { svc, repo } = setup(OCR);
    repo.setOverrides('ocr', [on('ocr', FlagScope.GLOBAL)]);
    expect(await svc.isEnabled('ocr', {})).toBe(true);
    repo.clearOverrides();
    expect(await svc.isEnabled('ocr', {})).toBe(false);
  });

  it('exposes flag definitions through the registry', () => {
    const { registry } = setup(OCR, WHATSAPP);
    expect(registry.get('ocr')).toEqual(OCR);
    expect(registry.has('whatsapp')).toBe(true);
    expect(registry.list()).toHaveLength(2);
  });

  it('keeps an inactive flag off even if an override turns it on', async () => {
    const { svc, repo } = setup(flag('legacy', { isActive: false }));
    repo.setOverrides('legacy', [on('legacy', FlagScope.GLOBAL)]);
    expect(await svc.evaluate('legacy', {})).toMatchObject({ enabled: false, reason: EvaluationReason.FLAG_DISABLED });
  });

  it('falls back safely when evaluation throws: fail-closed flags go off, others use their default', async () => {
    const broken: FeatureFlagRepository = {
      ...new InMemoryFeatureFlagRepository(),
      getDefinition: async () => { throw new Error('db down'); },
    } as unknown as FeatureFlagRepository;
    const registry = new FeatureRegistry();
    registry.register(flag('closed', { defaultValue: true, failClosed: true }));
    registry.register(flag('open', { defaultValue: true, failClosed: false }));
    const svc = new FeatureFlagService(new PipelineEvaluator(broken), registry);
    const log = console.error;
    console.error = () => undefined;
    try {
      expect(await svc.evaluate('closed', {})).toMatchObject({ enabled: false, reason: EvaluationReason.FALLBACK_SAFE_DEFAULT });
      expect(await svc.evaluate('open', {})).toMatchObject({ enabled: true, reason: EvaluationReason.FALLBACK_SAFE_DEFAULT });
    } finally {
      console.error = log;
    }
  });
});

describe('pipeline stages', () => {
  it('schedule: off before enabledFrom and after enabledUntil', async () => {
    const { svc, repo } = setup(flag('promo', { defaultValue: true }));
    const day = 86_400_000;
    const iso = (offset: number): string => new Date(Date.now() + offset * day).toISOString();
    repo.setSchedule({ flagKey: 'promo', enabledFrom: iso(1) });
    expect((await svc.evaluate('promo', {})).reason).toBe(EvaluationReason.SCHEDULE_INACTIVE);
    repo.setSchedule({ flagKey: 'promo', enabledFrom: iso(-2), enabledUntil: iso(-1) });
    expect((await svc.evaluate('promo', {})).reason).toBe(EvaluationReason.SCHEDULE_INACTIVE);
    repo.setSchedule({ flagKey: 'promo', enabledFrom: iso(-1), enabledUntil: iso(1) });
    expect(await svc.isEnabled('promo', {})).toBe(true);
  });

  it('targeting: every rule must match', async () => {
    const { svc, repo } = setup(flag('beta', { defaultValue: true }));
    repo.setTargetingRules('beta', [
      { flagKey: 'beta', attribute: 'plan', operator: 'IN', value: ['pro', 'enterprise'] },
      { flagKey: 'beta', attribute: 'seats', operator: 'GREATER_THAN', value: 5 },
    ]);
    expect(await svc.isEnabled('beta', { plan: 'pro', attributes: { seats: 10 } })).toBe(true);
    expect((await svc.evaluate('beta', { plan: 'pro', attributes: { seats: 2 } })).reason).toBe(EvaluationReason.TARGETING_EXCLUDED);
    expect(await svc.isEnabled('beta', { plan: 'free', attributes: { seats: 10 } })).toBe(false);
    expect(await svc.isEnabled('beta', { plan: 'pro' })).toBe(false); // missing attribute fails the rule
  });

  it('rollout: deterministic per target, excludes when the target id is missing', async () => {
    const { svc, repo } = setup(flag('gradual', { defaultValue: true }));
    repo.setRollout({ flagKey: 'gradual', percentage: 50, hashKey: 'tenant_id' });
    const tenants = Array.from({ length: 200 }, (_, i) => `tenant-${i}`);
    const results = await Promise.all(tenants.map((tenantId) => svc.isEnabled('gradual', { tenantId })));
    const enabled = results.filter(Boolean).length;
    expect(enabled).toBeGreaterThan(60);
    expect(enabled).toBeLessThan(140);
    expect(await Promise.all(tenants.map((tenantId) => svc.isEnabled('gradual', { tenantId })))).toEqual(results);
    expect(await svc.isEnabled('gradual', {})).toBe(false);
    expect((await svc.evaluate('gradual', { tenantId: tenants[results.indexOf(false)] })).reason).toBe(EvaluationReason.ROLLOUT);
  });

  it('rollout: uses the user id when hashKey is user_id', async () => {
    const { svc, repo } = setup(flag('by-user', { defaultValue: true }));
    repo.setRollout({ flagKey: 'by-user', percentage: 0, hashKey: 'user_id' });
    expect(await svc.isEnabled('by-user', { tenantId: 't1', userId: 'u1' })).toBe(false);
    repo.setRollout({ flagKey: 'by-user', percentage: 100, hashKey: 'user_id' });
    expect(await svc.isEnabled('by-user', { tenantId: 't1', userId: 'u1' })).toBe(true);
  });

  describe('dependencies', () => {
    it('REQUIRES: enabled only while the required flag is', async () => {
      const { svc, repo } = setup(flag('child', { defaultValue: true }), flag('parent'));
      repo.setDependencies('child', [{ flagKey: 'child', dependsOnFlagKey: 'parent', type: DependencyType.REQUIRES }]);
      expect((await svc.evaluate('child', {})).reason).toBe(EvaluationReason.DEPENDENCY_DISABLED);
      repo.setOverrides('parent', [on('parent', FlagScope.GLOBAL)]);
      expect(await svc.isEnabled('child', {})).toBe(true);
    });

    it('CONFLICTS_WITH: off while the conflicting flag is on', async () => {
      const { svc, repo } = setup(flag('new-ui', { defaultValue: true }), flag('old-ui', { defaultValue: true }));
      repo.setDependencies('new-ui', [{ flagKey: 'new-ui', dependsOnFlagKey: 'old-ui', type: DependencyType.CONFLICTS_WITH }]);
      expect((await svc.evaluate('new-ui', {})).reason).toBe(EvaluationReason.DEPENDENCY_CONFLICT);
    });

    it('a shared dependency is not circular (diamond: A needs B and C, both need D)', async () => {
      const { svc, repo } = setup(flag('a', { defaultValue: true }), flag('b', { defaultValue: true }), flag('c', { defaultValue: true }), flag('d', { defaultValue: true }));
      const needs = (flagKey: string, dependsOnFlagKey: string) => ({ flagKey, dependsOnFlagKey, type: DependencyType.REQUIRES });
      repo.setDependencies('a', [needs('a', 'b'), needs('a', 'c')]);
      repo.setDependencies('b', [needs('b', 'd')]);
      repo.setDependencies('c', [needs('c', 'd')]);
      expect(await svc.isEnabled('a', {})).toBe(true);
    });

    it('a real cycle fails closed instead of recursing forever', async () => {
      const { svc, repo } = setup(flag('x', { defaultValue: true }), flag('y', { defaultValue: true }));
      repo.setDependencies('x', [{ flagKey: 'x', dependsOnFlagKey: 'y', type: DependencyType.REQUIRES }]);
      repo.setDependencies('y', [{ flagKey: 'y', dependsOnFlagKey: 'x', type: DependencyType.REQUIRES }]);
      expect(await svc.isEnabled('x', {})).toBe(false);
    });
  });
});

describe('isRolledOut (sdk)', () => {
  it('is unchanged without a salt and differs per flag with one', () => {
    const users = Array.from({ length: 300 }, (_, i) => `user-${i}`);
    expect(users.filter((u) => isRolledOut(u, 50)).length).toBe(users.filter((u) => isRolledOut(u, 50, undefined)).length);
    const a = users.map((u) => isRolledOut(u, 50, 'flag-a'));
    const b = users.map((u) => isRolledOut(u, 50, 'flag-b'));
    expect(a).not.toEqual(b);
    expect(users.map((u) => isRolledOut(u, 50, 'flag-a'))).toEqual(a);
    expect(isRolledOut('u', 0, 'f')).toBe(false);
    expect(isRolledOut('u', 100, 'f')).toBe(true);
  });
});
