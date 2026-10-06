import { storageErrors } from '../core/storage.errors';
import type { IStorageAttachmentRepository, IStorageFileRepository } from '../repositories';
import { StorageFileStatus, type StorageAttachment } from '../types/storage.types';
import type { StorageActor } from './mappers';

/** Generic file ↔ entity links; knows nothing about invoices, employees, etc. */
export class StorageAttachmentService {
  constructor(
    private readonly attachments: IStorageAttachmentRepository,
    private readonly files: IStorageFileRepository,
  ) {}

  async attach(
    actor: StorageActor,
    input: { fileId: string; entityType: string; entityId: string; category: string },
  ): Promise<StorageAttachment> {
    const file = await this.files.findById(actor.tenantId, input.fileId);
    if (!file) throw storageErrors.fileNotFound();
    if (file.status !== StorageFileStatus.Uploaded) {
      throw storageErrors.uploadNotCompleted('Only uploaded files can be attached');
    }
    return this.attachments.create({ ...input, tenantId: actor.tenantId, createdBy: actor.userId });
  }

  list(tenantId: string, entityType: string, entityId: string, category?: string): Promise<StorageAttachment[]> {
    return this.attachments.listByEntity(tenantId, entityType, entityId, category);
  }

  async detach(tenantId: string, id: string): Promise<void> {
    if (!(await this.attachments.delete(tenantId, id))) throw storageErrors.fileNotFound();
  }
}
