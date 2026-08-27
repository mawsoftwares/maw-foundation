import { describe, it, expect } from 'vitest';
import {
  createFeatureFlagService,
  type FeatureFlagDefinition,
  type FlagOverride,
} from '../src/index';

const OCR_FLAG: FeatureFlagDefinition = {
  key: 'ocr',
  name: 'OCR',
  description: 'Optical character recognition',
  defaultValue: false,
  scope: 'global',
};

const WHATSAPP_FLAG: FeatureFlagDefinition = {
  key: 'whatsapp',
  name: 'WhatsApp Integration',
  defaultValue: false,
  scope: 'tenant',
};

const ADVANCED_REPORTS_FLAG: FeatureFlagDefinition = {
  key: 'advanced-reports',
  name: 'Advanced Reports',
  defaultValue: true,
  scope: 'global',
};

describe('@mawsoftwares/feature-flags — FeatureFlagService', () => {
  it('should return false for unknown flags', () => {
    const svc = createFeatureFlagService();
    expect(svc.isEnabled('nonexistent')).toBe(false);
  });

  it('should return default value when no overrides exist', () => {
    const svc = createFeatureFlagService();
    svc.registerFlags(OCR_FLAG, ADVANCED_REPORTS_FLAG);
    expect(svc.isEnabled('ocr')).toBe(false);
    expect(svc.isEnabled('advanced-reports')).toBe(true);
  });

  it('should apply global overrides', () => {
    const svc = createFeatureFlagService();
    svc.registerFlags(OCR_FLAG);
    svc.addOverrides({ flagKey: 'ocr', scope: 'global', enabled: true });
    expect(svc.isEnabled('ocr')).toBe(true);
  });

  it('should apply tenant-specific overrides', () => {
    const svc = createFeatureFlagService();
    svc.registerFlags(OCR_FLAG);

    svc.addOverrides(
      { flagKey: 'ocr', scope: 'global', enabled: true },
      { flagKey: 'ocr', scope: 'tenant', scopeId: 'tenant-b', enabled: false },
    );

    // Tenant A sees global override (ON)
    expect(svc.isEnabled('ocr', { tenantId: 'tenant-a' })).toBe(true);
    // Tenant B has a tenant-level override (OFF)
    expect(svc.isEnabled('ocr', { tenantId: 'tenant-b' })).toBe(false);
  });

  it('should prioritize user > tenant > environment > global', () => {
    const svc = createFeatureFlagService();
    svc.registerFlags(WHATSAPP_FLAG);

    svc.addOverrides(
      { flagKey: 'whatsapp', scope: 'global', enabled: true },
      { flagKey: 'whatsapp', scope: 'tenant', scopeId: 't1', enabled: false },
      { flagKey: 'whatsapp', scope: 'user', scopeId: 'u1', enabled: true },
    );

    // User-level override wins
    expect(svc.isEnabled('whatsapp', { tenantId: 't1', userId: 'u1' })).toBe(true);
    // Without user, tenant override wins
    expect(svc.isEnabled('whatsapp', { tenantId: 't1' })).toBe(false);
    // Without tenant or user, global override wins
    expect(svc.isEnabled('whatsapp')).toBe(true);
  });

  it('should evaluate all flags at once', () => {
    const svc = createFeatureFlagService();
    svc.registerFlags(OCR_FLAG, WHATSAPP_FLAG, ADVANCED_REPORTS_FLAG);
    svc.addOverrides({ flagKey: 'ocr', scope: 'global', enabled: true });

    const all = svc.evaluateAll();
    expect(all).toEqual({
      'ocr': true,
      'whatsapp': false,
      'advanced-reports': true,
    });
  });

  it('should clear overrides', () => {
    const svc = createFeatureFlagService();
    svc.registerFlags(OCR_FLAG);
    svc.addOverrides({ flagKey: 'ocr', scope: 'global', enabled: true });
    expect(svc.isEnabled('ocr')).toBe(true);

    svc.clearOverrides();
    expect(svc.isEnabled('ocr')).toBe(false); // back to default
  });

  it('should return flag definitions', () => {
    const svc = createFeatureFlagService();
    svc.registerFlags(OCR_FLAG, WHATSAPP_FLAG);
    expect(svc.getDefinition('ocr')).toEqual(OCR_FLAG);
    expect(svc.getAllDefinitions().length).toBe(2);
  });
});
