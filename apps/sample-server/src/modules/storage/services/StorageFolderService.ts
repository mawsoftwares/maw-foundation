import { randomUUID } from 'node:crypto';
import { createLogger } from '@mawsoftwares/sdk';
import { MAX_FOLDER_DEPTH } from '../core/storage.constants';
import { storageErrors } from '../core/storage.errors';
import type { FolderListQuery, IStorageFolderRepository } from '../repositories';
import type { PageResult, StorageFolder, StorageFolderView } from '../types/storage.types';
import { toFolderView, type StorageActor } from './mappers';
import type { StorageConfigurationService } from './StorageConfigurationService';

const log = createLogger('storage:folders');

export interface StorageFolderServiceDeps {
  readonly folders: IStorageFolderRepository;
  readonly configurations: StorageConfigurationService;
}

function joinPath(parent: StorageFolder | null, name: string): string {
  return `${parent?.path ?? ''}/${name}`;
}

export class StorageFolderService {
  constructor(private readonly deps: StorageFolderServiceDeps) {}

  async list(tenantId: string, query: FolderListQuery): Promise<PageResult<StorageFolderView>> {
    if (query.parentId !== null) await this.require(tenantId, query.parentId);
    const result = await this.deps.folders.list(tenantId, query);
    return { items: result.items.map(toFolderView), total: result.total };
  }

  /** Tenant-scoped lookup; a folder owned by another tenant is indistinguishable from a missing one. */
  async require(tenantId: string, id: string): Promise<StorageFolder> {
    const folder = await this.deps.folders.findById(tenantId, id);
    if (!folder) throw storageErrors.folderNotFound();
    return folder;
  }

  async create(
    actor: StorageActor,
    input: { name: string; parentId: string | null; storageConfigId?: string },
  ): Promise<StorageFolderView> {
    const { tenantId } = actor;
    const parent = input.parentId === null ? null : await this.require(tenantId, input.parentId);

    if (parent && input.storageConfigId !== undefined && input.storageConfigId !== parent.storageConfigId) {
      throw storageErrors.invalidInput('A child folder must use its parent folder storage configuration');
    }
    const configId =
      parent?.storageConfigId ??
      (input.storageConfigId !== undefined
        ? (await this.deps.configurations.requireActive(tenantId, input.storageConfigId)).id
        : (await this.deps.configurations.requireDefault(tenantId)).id);

    const path = joinPath(parent, input.name);
    this.assertDepth(path);
    await this.assertNameFree(tenantId, configId, input.parentId, input.name);

    const folder = await this.deps.folders.create({
      id: randomUUID(),
      tenantId,
      storageConfigId: configId,
      parentId: input.parentId,
      name: input.name,
      path,
      createdBy: actor.userId,
    });
    log.info('Folder created', { tenantId, folderId: folder.id });
    return toFolderView(folder);
  }

  /** Rename and/or move. */
  async update(tenantId: string, id: string, patch: { name?: string; parentId?: string | null }): Promise<StorageFolderView> {
    const folder = await this.require(tenantId, id);
    const parentId = patch.parentId === undefined ? folder.parentId : patch.parentId;
    const name = patch.name ?? folder.name;
    const parent = parentId === null ? null : await this.require(tenantId, parentId);

    if (parent) {
      if (parent.storageConfigId !== folder.storageConfigId) {
        throw storageErrors.invalidInput('A folder cannot be moved to a different storage configuration');
      }
      if ((await this.deps.folders.ancestorIds(tenantId, parent.id)).includes(folder.id)) {
        throw storageErrors.conflict('A folder cannot be moved into itself or one of its subfolders');
      }
    }

    const sibling = await this.deps.folders.findSibling(tenantId, folder.storageConfigId, parentId, name);
    if (sibling && sibling.id !== folder.id) throw storageErrors.conflict('A folder with this name already exists here');

    const path = joinPath(parent, name);
    this.assertDepth(path);
    const updated = await this.deps.folders.update(tenantId, id, { name, parentId, path });
    if (!updated) throw storageErrors.folderNotFound();
    if (path !== folder.path) await this.deps.folders.rewriteDescendantPaths(tenantId, folder.path, path);
    log.info('Folder updated', { tenantId, folderId: id });
    return toFolderView(updated);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.require(tenantId, id);
    const children = await this.deps.folders.countChildren(tenantId, id);
    if (children.folders > 0 || children.files > 0) {
      throw storageErrors.conflict('Folder is not empty; delete or move its contents first');
    }
    await this.deps.folders.softDelete(tenantId, id);
    log.info('Folder deleted', { tenantId, folderId: id });
  }

  private async assertNameFree(tenantId: string, configId: string, parentId: string | null, name: string): Promise<void> {
    if (await this.deps.folders.findSibling(tenantId, configId, parentId, name)) {
      throw storageErrors.conflict('A folder with this name already exists here');
    }
  }

  private assertDepth(path: string): void {
    if (path.split('/').length - 1 > MAX_FOLDER_DEPTH) throw storageErrors.invalidInput('Folder nesting is too deep');
  }
}
