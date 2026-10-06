import type { Controller } from '@mawsoftwares/api';
import { created, noContent, ok } from '@mawsoftwares/api';
import type { StorageConfigurationService } from '../services';
import {
  parseUuid,
  validateCreateConfiguration,
  validateUpdateConfiguration,
} from '../validators/storage.validators';
import { actorOf, paramOf } from './controller.util';

export class StorageConfigurationController {
  constructor(private readonly configurations: StorageConfigurationService) {}

  /** Available providers and the settings each needs. */
  readonly providers: Controller = async () => ok(this.configurations.listProviders());

  readonly list: Controller = async ({ context }) => ok(await this.configurations.list(actorOf(context).tenantId));

  readonly create: Controller = async ({ body, context }) =>
    created(await this.configurations.create(actorOf(context).tenantId, validateCreateConfiguration(body)));

  readonly update: Controller = async ({ params, body, context }) =>
    ok(await this.configurations.update(actorOf(context).tenantId, parseUuid(paramOf(params, 'id'), 'id'), validateUpdateConfiguration(body)));

  readonly remove: Controller = async ({ params, context }) => {
    await this.configurations.delete(actorOf(context).tenantId, parseUuid(paramOf(params, 'id'), 'id'));
    return noContent();
  };

  readonly test: Controller = async ({ params, context }) =>
    ok(await this.configurations.test(actorOf(context).tenantId, parseUuid(paramOf(params, 'id'), 'id')));
}
