import type { Controller } from '@mawsoftwares/api';
import { created, ok } from '@mawsoftwares/api';
import type { StorageLimits } from '../core/storage.constants';
import type { StorageUploadService } from '../services';
import { parseUuid, validateCreateUpload } from '../validators/storage.validators';
import { actorOf, paramOf } from './controller.util';

export class StorageUploadController {
  constructor(
    private readonly uploads: StorageUploadService,
    private readonly limits: StorageLimits,
  ) {}

  readonly requestUpload: Controller = async ({ body, context }) => {
    const result = await this.uploads.requestUpload(actorOf(context), validateCreateUpload(body, this.limits));
    return created(result);
  };

  readonly completeUpload: Controller = async ({ params, context }) => {
    const result = await this.uploads.completeUpload(actorOf(context), parseUuid(paramOf(params, 'fileId'), 'fileId'));
    return ok(result);
  };
}
