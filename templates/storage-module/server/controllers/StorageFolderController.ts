import type { Controller } from '@mawsoftwares/api';
import { created, noContent, ok, paginated } from '@mawsoftwares/api';
import { paginate } from '@mawsoftwares/sdk/config/constants';
import type { StorageFolderService } from '../services';
import {
  parseListQuery,
  parseParentRef,
  parseUuid,
  validateCreateFolder,
  validateUpdateFolder,
} from '../validators/storage.validators';
import { actorOf, paramOf } from './controller.util';

export class StorageFolderController {
  constructor(private readonly folders: StorageFolderService) {}

  /** `?parentId=` omitted or `root` lists root folders. */
  readonly list: Controller = async ({ query, context }) => {
    const { tenantId } = actorOf(context);
    const list = parseListQuery(query);
    const result = await this.folders.list(tenantId, { ...list, parentId: parseParentRef(query['parentId'], 'parentId') });
    return paginated(paginate(result.items, result.total, list.page, list.pageSize));
  };

  readonly create: Controller = async ({ body, context }) =>
    created(await this.folders.create(actorOf(context), validateCreateFolder(body)));

  readonly update: Controller = async ({ params, body, context }) =>
    ok(await this.folders.update(actorOf(context).tenantId, parseUuid(paramOf(params, 'id'), 'id'), validateUpdateFolder(body)));

  readonly remove: Controller = async ({ params, context }) => {
    await this.folders.delete(actorOf(context).tenantId, parseUuid(paramOf(params, 'id'), 'id'));
    return noContent();
  };
}
