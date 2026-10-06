import { randomUUID } from 'node:crypto';
import { AesEncryptionService } from '@mawsoftwares/platform/security/AesEncryptionService';
import type {
  CreateDownloadUrlInput,
  CreateUploadUrlInput,
  ObjectMetadata,
  ObjectRef,
  StorageProvider,
} from '../core/StorageProvider';
import { StorageProviderFactory } from '../core/StorageProviderFactory';
import { DEFAULT_STORAGE_LIMITS } from '../core/storage.constants';
import { storageErrors } from '../core/storage.errors';
import type {
  FileListQuery,
  FolderListQuery,
  IStorageAttachmentRepository,
  IStorageFileRepository,
  IStorageFileVersionRepository,
  IStorageFolderRepository,
  IStorageProviderConfigRepository,
  NewAttachment,
  NewFile,
  NewFolder,
  NewProviderConfig,
  ProviderConfigPatch,
} from '../repositories';
import {
  StorageAttachmentService,
  StorageCleanupService,
  StorageConfigurationService,
  StorageDownloadService,
  StorageFolderService,
  StorageService,
  StorageUploadService,
  type StorageActor,
} from '../services';
import {
  StorageFileStatus,
  type PageResult,
  type StorageAttachment,
  type StorageFile,
  type StorageFileVersion,
  type StorageFolder,
  type StorageProviderConfig,
  type StorageProviderRecord,
  type StorageProviderType,
} from '../types/storage.types';
import { StorageCredentialCipher } from '../utils/credentials.util';
import { AZURE_DESCRIPTOR, LOCAL_DESCRIPTOR, R2_DESCRIPTOR, S3_DESCRIPTOR } from '../providers/descriptors';

const now = (): string => new Date().toISOString();

export class InMemoryStore {
  providers: StorageProviderRecord[] = [
    { id: 'p-local', code: 'local', name: 'Local', providerType: 'local', isActive: true },
    { id: 'p-s3', code: 's3', name: 'S3', providerType: 's3', isActive: true },
    { id: 'p-r2', code: 'r2', name: 'R2', providerType: 'r2', isActive: true },
    { id: 'p-azure', code: 'azure', name: 'Azure', providerType: 'azure', isActive: true },
  ];
  configs = new Map<string, StorageProviderConfig>();
  folders = new Map<string, StorageFolder>();
  files = new Map<string, StorageFile>();
  versions: StorageFileVersion[] = [];
  attachments: StorageAttachment[] = [];
}

function page<T>(items: T[], p: { page: number; pageSize: number }): PageResult<T> {
  return { items: items.slice((p.page - 1) * p.pageSize, p.page * p.pageSize), total: items.length };
}

class MemConfigRepo implements IStorageProviderConfigRepository {
  constructor(private readonly s: InMemoryStore) {}
  async findProviderByType(type: StorageProviderType) {
    return this.s.providers.find((p) => p.providerType === type) ?? null;
  }
  async list(tenantId: string) {
    return [...this.s.configs.values()].filter((c) => c.tenantId === tenantId);
  }
  async findById(tenantId: string, id: string) {
    const c = this.s.configs.get(id);
    return c && c.tenantId === tenantId ? c : null;
  }
  async findDefault(tenantId: string) {
    return [...this.s.configs.values()].find((c) => c.tenantId === tenantId && c.isDefault && c.isActive) ?? null;
  }
  async create(input: NewProviderConfig) {
    const provider = this.s.providers.find((p) => p.id === input.providerId)!;
    const config: StorageProviderConfig = {
      ...input,
      providerType: provider.providerType,
      isDefault: false,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    };
    this.s.configs.set(input.id, config);
    return config;
  }
  async update(tenantId: string, id: string, patch: ProviderConfigPatch) {
    const existing = await this.findById(tenantId, id);
    if (!existing) return null;
    const next = { ...existing, ...patch, updatedAt: now() } as StorageProviderConfig;
    this.s.configs.set(id, next);
    return next;
  }
  async setDefault(tenantId: string, id: string) {
    for (const c of this.s.configs.values()) {
      if (c.tenantId === tenantId) this.s.configs.set(c.id, { ...c, isDefault: c.id === id });
    }
  }
  async delete(tenantId: string, id: string) {
    return (await this.findById(tenantId, id)) ? this.s.configs.delete(id) : false;
  }
  async countReferences(tenantId: string, id: string) {
    return (
      [...this.s.folders.values()].filter((f) => f.tenantId === tenantId && f.storageConfigId === id).length +
      [...this.s.files.values()].filter((f) => f.tenantId === tenantId && f.storageConfigId === id).length
    );
  }
}

class MemFolderRepo implements IStorageFolderRepository {
  constructor(private readonly s: InMemoryStore) {}
  private active(tenantId: string) {
    return [...this.s.folders.values()].filter((f) => f.tenantId === tenantId && f.deletedAt === null);
  }
  async findById(tenantId: string, id: string) {
    return this.active(tenantId).find((f) => f.id === id) ?? null;
  }
  async list(tenantId: string, q: FolderListQuery) {
    let items = this.active(tenantId).filter((f) => f.parentId === q.parentId);
    if (q.search) items = items.filter((f) => f.name.toLowerCase().includes(q.search!.toLowerCase()));
    items.sort((a, b) => a.name.localeCompare(b.name));
    return page(items, q);
  }
  async findSibling(tenantId: string, configId: string, parentId: string | null, name: string) {
    return (
      this.active(tenantId).find(
        (f) => f.storageConfigId === configId && f.parentId === parentId && f.name.toLowerCase() === name.toLowerCase(),
      ) ?? null
    );
  }
  async create(input: NewFolder) {
    const folder: StorageFolder = { ...input, createdAt: now(), updatedAt: now(), deletedAt: null };
    this.s.folders.set(folder.id, folder);
    return folder;
  }
  async update(tenantId: string, id: string, patch: { name: string; parentId: string | null; path: string }) {
    const f = await this.findById(tenantId, id);
    if (!f) return null;
    const next = { ...f, ...patch, updatedAt: now() };
    this.s.folders.set(id, next);
    return next;
  }
  async rewriteDescendantPaths(tenantId: string, oldPath: string, newPath: string) {
    for (const f of this.active(tenantId)) {
      if (f.path.startsWith(`${oldPath}/`)) this.s.folders.set(f.id, { ...f, path: newPath + f.path.slice(oldPath.length) });
    }
  }
  async ancestorIds(tenantId: string, id: string) {
    const ids: string[] = [];
    let cursor: string | null = id;
    while (cursor) {
      const f = this.s.folders.get(cursor);
      if (!f || f.tenantId !== tenantId) break;
      ids.push(f.id);
      cursor = f.parentId;
    }
    return ids;
  }
  async countChildren(tenantId: string, id: string) {
    return {
      folders: this.active(tenantId).filter((f) => f.parentId === id).length,
      files: [...this.s.files.values()].filter((f) => f.tenantId === tenantId && f.folderId === id && f.deletedAt === null).length,
    };
  }
  async softDelete(tenantId: string, id: string) {
    const f = await this.findById(tenantId, id);
    if (!f) return false;
    this.s.folders.set(id, { ...f, deletedAt: now() });
    return true;
  }
}

class MemFileRepo implements IStorageFileRepository {
  constructor(private readonly s: InMemoryStore) {}
  async create(input: NewFile) {
    const file: StorageFile = {
      ...input,
      checksum: null,
      status: StorageFileStatus.Pending,
      visibility: 'private',
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    this.s.files.set(file.id, file);
    return file;
  }
  async findById(tenantId: string, id: string) {
    const f = this.s.files.get(id);
    return f && f.tenantId === tenantId && f.deletedAt === null ? f : null;
  }
  private async transition(tenantId: string, id: string, status: StorageFileStatus, checksum: string | null) {
    const f = await this.findById(tenantId, id);
    if (!f || (f.status !== 'pending' && f.status !== 'uploading')) return null;
    const next = { ...f, status, checksum: checksum ?? f.checksum, updatedAt: now() };
    this.s.files.set(id, next);
    return next;
  }
  markUploaded(tenantId: string, id: string, checksum: string | null) {
    return this.transition(tenantId, id, StorageFileStatus.Uploaded, checksum);
  }
  markFailed(tenantId: string, id: string) {
    return this.transition(tenantId, id, StorageFileStatus.Failed, null);
  }
  async softDelete(tenantId: string, id: string) {
    const f = await this.findById(tenantId, id);
    if (!f) return null;
    const next = { ...f, deletedAt: now() };
    this.s.files.set(id, next);
    return next;
  }
  async markDeleted(tenantId: string, id: string) {
    const f = this.s.files.get(id);
    if (f && f.tenantId === tenantId) this.s.files.set(id, { ...f, status: StorageFileStatus.Deleted });
  }
  async listUploadedInFolder(tenantId: string, q: FileListQuery) {
    let items = [...this.s.files.values()].filter(
      (f) => f.tenantId === tenantId && f.deletedAt === null && f.status === 'uploaded' && f.folderId === q.folderId,
    );
    if (q.search) items = items.filter((f) => f.originalName.toLowerCase().includes(q.search!.toLowerCase()));
    items.sort((a, b) => a.originalName.localeCompare(b.originalName));
    return page(items, q);
  }
  async listPendingObjectDeletion(limit: number) {
    return [...this.s.files.values()].filter((f) => f.deletedAt !== null && f.status !== 'deleted').slice(0, limit);
  }
  async listStalePending(olderThan: Date, limit: number) {
    return [...this.s.files.values()]
      .filter((f) => (f.status === 'pending' || f.status === 'uploading') && new Date(f.createdAt) < olderThan)
      .slice(0, limit);
  }
}

class MemVersionRepo implements IStorageFileVersionRepository {
  constructor(private readonly s: InMemoryStore) {}
  async createForFile(file: StorageFile, createdBy: string | null) {
    const n = this.s.versions.filter((v) => v.fileId === file.id).length + 1;
    const version: StorageFileVersion = {
      id: randomUUID(),
      fileId: file.id,
      versionNumber: n,
      objectKey: file.objectKey,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      checksum: file.checksum,
      createdBy,
      createdAt: now(),
    };
    this.s.versions.push(version);
    return version;
  }
  async listByFile(tenantId: string, fileId: string) {
    const f = this.s.files.get(fileId);
    return f && f.tenantId === tenantId ? this.s.versions.filter((v) => v.fileId === fileId) : [];
  }
}

class MemAttachmentRepo implements IStorageAttachmentRepository {
  constructor(private readonly s: InMemoryStore) {}
  async create(input: NewAttachment) {
    const existing = this.s.attachments.find(
      (a) => a.tenantId === input.tenantId && a.fileId === input.fileId && a.entityType === input.entityType && a.entityId === input.entityId && a.category === input.category,
    );
    if (existing) return existing;
    const a: StorageAttachment = { id: randomUUID(), ...input, createdAt: now() };
    this.s.attachments.push(a);
    return a;
  }
  async listByEntity(tenantId: string, entityType: string, entityId: string, category?: string) {
    return this.s.attachments.filter(
      (a) => a.tenantId === tenantId && a.entityType === entityType && a.entityId === entityId && (!category || a.category === category),
    );
  }
  async delete(tenantId: string, id: string) {
    const i = this.s.attachments.findIndex((a) => a.tenantId === tenantId && a.id === id);
    if (i < 0) return false;
    this.s.attachments.splice(i, 1);
    return true;
  }
}

/** In-memory object store standing in for any real provider. */
export class FakeProvider implements StorageProvider {
  readonly objects = new Map<string, { size: number; contentType: string | null }>();
  failDelete = false;
  constructor(readonly configId: string) {}
  async createUploadUrl(input: CreateUploadUrlInput) {
    return {
      url: `https://fake.invalid/${this.configId}/put/${input.key}`,
      method: 'PUT' as const,
      headers: { 'Content-Type': input.contentType },
      expiresAt: now(),
    };
  }
  async createDownloadUrl(input: CreateDownloadUrlInput) {
    return { url: `https://fake.invalid/${this.configId}/get/${input.key}`, expiresAt: now() };
  }
  async deleteObject({ key }: ObjectRef) {
    if (this.failDelete) throw storageErrors.providerError();
    this.objects.delete(key);
  }
  async objectExists({ key }: ObjectRef) {
    return this.objects.has(key);
  }
  async getObjectMetadata({ key }: ObjectRef): Promise<ObjectMetadata> {
    const o = this.objects.get(key);
    if (!o) throw storageErrors.objectNotFound();
    return { size: o.size, contentType: o.contentType, etag: '"abc123"' };
  }
  async verifyAccess() {
    /* reachable */
  }
}

export const TENANT_A = 'tenant-a';
export const TENANT_B = 'tenant-b';

export function actor(tenantId: string, userId = 'user-1'): StorageActor {
  return { tenantId, userId };
}

export function buildHarness() {
  const store = new InMemoryStore();
  const providers = new Map<string, FakeProvider>();
  const factory = new StorageProviderFactory();
  const creator = (config: { configId: string }) => {
    let p = providers.get(config.configId);
    if (!p) providers.set(config.configId, (p = new FakeProvider(config.configId)));
    return p;
  };
  factory
    .register('local', creator, LOCAL_DESCRIPTOR)
    .register('s3', creator, S3_DESCRIPTOR)
    .register('r2', creator, R2_DESCRIPTOR)
    .register('azure', creator, AZURE_DESCRIPTOR);

  const encryption = new AesEncryptionService('11'.repeat(32));
  const configRepo = new MemConfigRepo(store);
  const fileRepo = new MemFileRepo(store);
  const configurations = new StorageConfigurationService({ configs: configRepo, cipher: new StorageCredentialCipher(encryption), factory });
  const folders = new StorageFolderService({ folders: new MemFolderRepo(store), configurations });
  const versions = new MemVersionRepo(store);
  const limits = { ...DEFAULT_STORAGE_LIMITS, maxFileSizeBytes: 10_000 };

  return {
    store,
    providers,
    factory,
    configurations,
    folders,
    limits,
    uploads: new StorageUploadService({ files: fileRepo, versions, folders, configurations, limits }),
    downloads: new StorageDownloadService(fileRepo, configurations, limits),
    files: new StorageService(fileRepo, folders, configurations),
    cleanup: new StorageCleanupService(fileRepo, configurations),
    attachments: new StorageAttachmentService(new MemAttachmentRepo(store), fileRepo),
    /** Creates a default local config for the tenant and returns its id. */
    async seedConfig(tenantId: string): Promise<string> {
      return (await configurations.create(tenantId, { provider: 'local', name: `${tenantId} local` })).id;
    },
    providerFor(configId: string): FakeProvider {
      return providers.get(configId) ?? (creator({ configId }) as FakeProvider);
    },
  };
}

export type Harness = ReturnType<typeof buildHarness>;

/** Runs the upload request and simulates the client PUT to the provider. */
export async function uploadFile(
  h: Harness,
  a: StorageActor,
  opts: { folderId?: string | null; fileName?: string; contentType?: string; fileSize?: number; putSize?: number | null } = {},
) {
  const fileSize = opts.fileSize ?? 1234;
  const res = await h.uploads.requestUpload(a, {
    folderId: opts.folderId ?? null,
    fileName: opts.fileName ?? 'invoice.pdf',
    contentType: opts.contentType ?? 'application/pdf',
    fileSize,
  });
  const file = h.store.files.get(res.fileId)!;
  if (opts.putSize !== null) {
    h.providerFor(file.storageConfigId).objects.set(file.objectKey, {
      size: opts.putSize ?? fileSize,
      contentType: opts.contentType ?? 'application/pdf',
    });
  }
  return { ...res, file };
}
