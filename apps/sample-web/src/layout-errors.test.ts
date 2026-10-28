import { describe, expect, it } from 'vitest';
import { ApiError } from '@mawsoftwares/api-client';
import { ProjectUiStoreError } from '@mawsoftwares/layout';
import { translateLayoutError } from './layout-errors';

const thrown = (e: unknown): unknown => {
  try { return translateLayoutError(e); } catch (err) { return err; }
};

describe('translateLayoutError', () => {
  it('maps a validation failure to INVALID with field paths', () => {
    const body = { success: false, error: { code: 'VALIDATION_FAILED', message: 'Validation failed', details: { fields: [{ field: 'layout.presetId', error: 'Unknown preset.' }] } } };
    const e = thrown(new ApiError(400, 'Validation failed', body, 'VALIDATION_FAILED')) as ProjectUiStoreError;
    expect(e).toBeInstanceOf(ProjectUiStoreError);
    expect(e.code).toBe('INVALID');
    expect(e.issues[0]?.path).toBe('layout.presetId');
  });

  it('maps conflict and not-found to the domain outcomes', () => {
    expect((thrown(new ApiError(409, 'no draft', undefined, 'CONFLICT')) as ProjectUiStoreError).code).toBe('NO_DRAFT');
    expect((thrown(new ApiError(404, 'gone', undefined, 'NOT_FOUND')) as ProjectUiStoreError).code).toBe('NO_SUCH_REVISION');
  });

  it('rethrows anything else untouched (403, network, 500)', () => {
    const forbidden = new ApiError(403, 'Forbidden', undefined, 'FORBIDDEN');
    expect(thrown(forbidden)).toBe(forbidden);
    const net = new TypeError('Failed to fetch');
    expect(thrown(net)).toBe(net);
  });
});
