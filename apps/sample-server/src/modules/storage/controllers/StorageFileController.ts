import type { Controller } from '@mawsoftwares/api';
import { noContent, ok, paginated } from '@mawsoftwares/api';
import { paginate } from '@mawsoftwares/sdk/config/constants';
import type {
  StorageAttachmentService,
  StorageDownloadService,
  StorageService,
} from '../services';
import {
  parseDisposition,
  parseListQuery,
  parseParentRef,
  parseUuid,
  validateCreateAttachment,
  validateEntityQuery,
} from '../validators/storage.validators';
import { actorOf, paramOf } from './controller.util';
import { created } from '@mawsoftwares/api';

export class StorageFileController {
  constructor(
    private readonly files: StorageService,
    private readonly downloads: StorageDownloadService,
    private readonly attachments: StorageAttachmentService,
  ) {}

  readonly getFile: Controller = async ({ params, context }) => {
    const { tenantId } = actorOf(context);
    return ok(await this.files.getFile(tenantId, parseUuid(paramOf(params, 'fileId'), 'fileId')));
  };

  readonly getDownloadUrl: Controller = async ({ params, query, context }) => {
    const result = await this.downloads.createDownloadUrl(
      actorOf(context),
      parseUuid(paramOf(params, 'fileId'), 'fileId'),
      parseDisposition(query['disposition']),
    );
    return ok(result);
  };

  readonly deleteFile: Controller = async ({ params, context }) => {
    await this.files.deleteFile(actorOf(context), parseUuid(paramOf(params, 'fileId'), 'fileId'));
    return noContent();
  };

  /** `:id` is a folder UUID or the literal `root`. */
  readonly listFolderFiles: Controller = async ({ params, query, context }) => {
    const { tenantId } = actorOf(context);
    const list = parseListQuery(query);
    const result = await this.files.listFiles(tenantId, {
      ...list,
      folderId: parseParentRef(paramOf(params, 'id'), 'id'),
    });
    return paginated(paginate(result.items, result.total, list.page, list.pageSize));
  };

  readonly attach: Controller = async ({ body, context }) =>
    created(await this.attachments.attach(actorOf(context), validateCreateAttachment(body)));

  readonly listAttachments: Controller = async ({ query, context }) => {
    const { entityType, entityId, category } = validateEntityQuery(query);
    return ok(await this.attachments.list(actorOf(context).tenantId, entityType, entityId, category));
  };

  readonly detach: Controller = async ({ params, context }) => {
    await this.attachments.detach(actorOf(context).tenantId, parseUuid(paramOf(params, 'id'), 'id'));
    return noContent();
  };
}
