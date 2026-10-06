// MAW Storage — provider-agnostic file storage module.
// Self-contained: depends only on the SDK (errors/logger), the `Controller` type, an injected
// Postgres pool and an injected encryption service, so it can be lifted into `@maw/storage` later.
import type { RequestHandler, Router } from 'express';
import type { PgPool } from '@mawsoftwares/database';
import type { IEncryptionService } from '@mawsoftwares/sdk/contracts/IEncryptionService';
import { StorageUploadController, StorageFileController, StorageFolderController, StorageConfigurationController } from './controllers';
import type { StorageModuleConfig } from './core/storage.config';
import { createDefaultProviderFactory, createLocalObjectRouter, LocalStorageProvider, LocalUrlSigner } from './providers';
import {
  PgStorageAttachmentRepository,
  PgStorageFileRepository,
  PgStorageFileVersionRepository,
  PgStorageFolderRepository,
  PgStorageProviderConfigRepository,
} from './repositories';
import { createStorageRouter } from './routes';
import {
  StorageAttachmentService,
  StorageCleanupService,
  StorageConfigurationService,
  StorageDownloadService,
  StorageFolderService,
  StorageService,
  StorageUploadService,
} from './services';
import { StorageCredentialCipher } from './utils/credentials.util';

export interface StorageModuleDeps {
  readonly pool: PgPool;
  readonly encryption: IEncryptionService;
  readonly config: StorageModuleConfig;
  readonly requireAuth: RequestHandler;
  readonly requirePermission: (perm: string) => RequestHandler;
}

export interface StorageModule {
  /** Mount at `/api/v1/storage` (authenticated, RBAC-guarded per route). */
  readonly router: Router;
  /**
   * Signed PUT/GET gateway used only when a tenant is on local storage. Mount at
   * `STORAGE_LOCAL_GATEWAY_PATH` BEFORE any body parser so uploads stream untouched.
   */
  readonly localGatewayRouter: Router;
  readonly services: {
    readonly configurations: StorageConfigurationService;
    readonly folders: StorageFolderService;
    readonly uploads: StorageUploadService;
    readonly downloads: StorageDownloadService;
    readonly files: StorageService;
    readonly attachments: StorageAttachmentService;
    readonly cleanup: StorageCleanupService;
  };
}

export function createStorageModule(deps: StorageModuleDeps): StorageModule {
  const { config } = deps;
  const signer = new LocalUrlSigner(config.localSigningSecret);
  const factory = createDefaultProviderFactory({
    localRoot: config.localRoot,
    localSigner: signer,
    publicBaseUrl: config.publicBaseUrl,
  });

  const configRepo = new PgStorageProviderConfigRepository(deps.pool);
  const folderRepo = new PgStorageFolderRepository(deps.pool);
  const fileRepo = new PgStorageFileRepository(deps.pool);
  const versionRepo = new PgStorageFileVersionRepository(deps.pool);
  const attachmentRepo = new PgStorageAttachmentRepository(deps.pool);

  const configurations = new StorageConfigurationService({
    configs: configRepo,
    cipher: new StorageCredentialCipher(deps.encryption),
    factory,
  });
  const folders = new StorageFolderService({ folders: folderRepo, configurations });
  const uploads = new StorageUploadService({ files: fileRepo, versions: versionRepo, folders, configurations, limits: config.limits });
  const downloads = new StorageDownloadService(fileRepo, configurations, config.limits);
  const files = new StorageService(fileRepo, folders, configurations);
  const attachments = new StorageAttachmentService(attachmentRepo, fileRepo);
  const cleanup = new StorageCleanupService(fileRepo, configurations);

  const router = createStorageRouter(
    {
      uploads: new StorageUploadController(uploads, config.limits),
      files: new StorageFileController(files, downloads, attachments),
      folders: new StorageFolderController(folders),
      configurations: new StorageConfigurationController(configurations),
    },
    { requireAuth: deps.requireAuth, requirePermission: deps.requirePermission },
  );

  const localGatewayRouter = createLocalObjectRouter({
    signer,
    resolveProvider: async (tenantId, configId) => {
      try {
        const { provider } = await configurations.resolve(tenantId, configId);
        return provider instanceof LocalStorageProvider ? provider : null;
      } catch {
        return null;
      }
    },
  });

  return { router, localGatewayRouter, services: { configurations, folders, uploads, downloads, files, attachments, cleanup } };
}

export { storageModule } from './permissions';
export { DEFAULT_CLEANUP_OPTIONS, type CleanupOptions, type CleanupReport } from './services/StorageCleanupService';
export { loadStorageConfig, type StorageModuleConfig } from './core/storage.config';
export { STORAGE_LOCAL_GATEWAY_PATH, STORAGE_ROUTE_PREFIX, STORAGE_PERMISSIONS } from './core/storage.constants';
export type { StorageProvider } from './core/StorageProvider';
export { StorageProviderFactory } from './core/StorageProviderFactory';
export { StorageError, StorageErrorReason } from './core/storage.errors';
export * from './types/storage.types';
