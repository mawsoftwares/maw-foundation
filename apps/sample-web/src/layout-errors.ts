import { ApiError, getApiErrorFields } from '@mawsoftwares/api-client';
import { ProjectUiStoreError } from '@mawsoftwares/layout';

/**
 * Server error → the store's own error type, so Layout Studio shows the field list for invalid configs and treats
 * "no draft" / "no such revision" as the domain outcomes they are. Anything else (403, offline, 500) is rethrown as-is.
 */
export function translateLayoutError(error: unknown): never {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_FAILED') {
      throw new ProjectUiStoreError('INVALID', error.message, getApiErrorFields(error).map((f) => ({ path: f.field, message: f.message })));
    }
    if (error.code === 'CONFLICT') throw new ProjectUiStoreError('NO_DRAFT', error.message);
    if (error.code === 'NOT_FOUND') throw new ProjectUiStoreError('NO_SUCH_REVISION', error.message);
  }
  throw error;
}
