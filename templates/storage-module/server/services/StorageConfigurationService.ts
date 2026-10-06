import { randomUUID } from 'node:crypto';
import { createLogger } from '@mawsoftwares/sdk';
import type { StorageProvider } from '../core/StorageProvider';
import type { StorageProviderFactory, StorageProviderRuntimeConfig } from '../core/StorageProviderFactory';
import { storageErrors } from '../core/storage.errors';
import type { IStorageProviderConfigRepository } from '../repositories';
import type {
  CreateConfigurationInput,
  StorageConfigurationView,
  StorageProviderConfig,
  UpdateConfigurationInput,
} from '../types/storage.types';
import type { StorageCredentialCipher } from '../utils/credentials.util';
import { normalizeBasePath } from '../utils/object-key.util';
import { toConfigurationView } from './mappers';

const log = createLogger('storage:config');

export interface ResolvedStorage {
  readonly config: StorageProviderConfig;
  readonly provider: StorageProvider;
}

export interface StorageConfigurationServiceDeps {
  readonly configs: IStorageProviderConfigRepository;
  readonly cipher: StorageCredentialCipher;
  readonly factory: StorageProviderFactory;
}

export class StorageConfigurationService {
  constructor(private readonly deps: StorageConfigurationServiceDeps) {}

  async list(tenantId: string): Promise<StorageConfigurationView[]> {
    return (await this.deps.configs.list(tenantId)).map(toConfigurationView);
  }

  async create(tenantId: string, input: CreateConfigurationInput): Promise<StorageConfigurationView> {
    const provider = await this.deps.configs.findProviderByType(input.provider);
    if (!provider || !this.deps.factory.isSupported(input.provider)) throw storageErrors.providerNotFound(input.provider);
    const isLocal = input.provider === 'local';
    if (isLocal && input.credentials) throw storageErrors.invalidInput('Local storage does not use credentials');

    const created = await this.deps.configs.create({
      id: randomUUID(),
      tenantId,
      providerId: provider.id,
      name: input.name,
      bucketName: isLocal ? null : (input.bucket ?? null),
      region: isLocal ? null : (input.region ?? null),
      endpoint: isLocal ? null : (input.endpoint ?? null),
      basePath: normalizeBasePath(input.basePath),
      encryptedCredentials: input.credentials ? await this.deps.cipher.encrypt(input.credentials) : null,
    });

    const hasDefault = (await this.deps.configs.findDefault(tenantId)) !== null;
    if (input.isDefault || !hasDefault) await this.deps.configs.setDefault(tenantId, created.id);
    log.info('Storage configuration created', { tenantId, configId: created.id, provider: input.provider });
    return toConfigurationView((await this.deps.configs.findById(tenantId, created.id))!);
  }

  async update(tenantId: string, id: string, input: UpdateConfigurationInput): Promise<StorageConfigurationView> {
    const existing = await this.require(tenantId, id);
    const isLocal = existing.providerType === 'local';
    if (isLocal && (input.credentials || input.bucket || input.region || input.endpoint)) {
      throw storageErrors.invalidInput('Local storage only supports name and base path');
    }
    if (input.isActive === false && existing.isDefault) {
      throw storageErrors.conflict('Choose another default configuration before deactivating this one');
    }
    const bucket = input.bucket === undefined ? existing.bucketName : input.bucket;
    const region = input.region === undefined ? existing.region : input.region;
    if (!isLocal && (!bucket || !region)) throw storageErrors.invalidInput('S3 storage requires a bucket and a region');

    await this.deps.configs.update(tenantId, id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(!isLocal && input.bucket !== undefined ? { bucketName: input.bucket } : {}),
      ...(!isLocal && input.region !== undefined ? { region: input.region } : {}),
      ...(!isLocal && input.endpoint !== undefined ? { endpoint: input.endpoint } : {}),
      ...(input.basePath !== undefined ? { basePath: normalizeBasePath(input.basePath) } : {}),
      ...(input.credentials ? { encryptedCredentials: await this.deps.cipher.encrypt(input.credentials) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    if (input.isDefault === true) await this.deps.configs.setDefault(tenantId, id);
    log.info('Storage configuration updated', { tenantId, configId: id });
    return toConfigurationView((await this.deps.configs.findById(tenantId, id))!);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const existing = await this.require(tenantId, id);
    if (existing.isDefault) throw storageErrors.conflict('The default configuration cannot be deleted');
    if ((await this.deps.configs.countReferences(tenantId, id)) > 0) {
      throw storageErrors.conflict('This configuration is used by folders or files; deactivate it instead');
    }
    await this.deps.configs.delete(tenantId, id);
    log.info('Storage configuration deleted', { tenantId, configId: id });
  }

  /** Connectivity probe. Never surfaces provider details to the caller. */
  async test(tenantId: string, id: string): Promise<{ ok: boolean; message: string }> {
    const { provider } = await this.resolve(tenantId, id, { allowInactive: true });
    try {
      await provider.verifyAccess();
      return { ok: true, message: 'Storage is reachable' };
    } catch {
      return { ok: false, message: 'Storage could not be reached with this configuration' };
    }
  }

  /**
   * Returns the provider for a tenant configuration (or the tenant default when `configId` is null).
   * Every lookup is tenant-scoped, so another tenant's configuration id behaves as "not found".
   */
  async resolve(
    tenantId: string,
    configId: string | null,
    options: { allowInactive?: boolean } = {},
  ): Promise<ResolvedStorage> {
    const config = configId === null ? await this.deps.configs.findDefault(tenantId) : await this.deps.configs.findById(tenantId, configId);
    if (!config || (!config.isActive && !options.allowInactive)) throw storageErrors.configurationNotFound();
    const provider = this.deps.factory.get(await this.toRuntime(config));
    return { config, provider };
  }

  async requireActive(tenantId: string, id: string): Promise<StorageProviderConfig> {
    const config = await this.deps.configs.findById(tenantId, id);
    if (!config || !config.isActive) throw storageErrors.configurationNotFound();
    return config;
  }

  async requireDefault(tenantId: string): Promise<StorageProviderConfig> {
    const config = await this.deps.configs.findDefault(tenantId);
    if (!config) throw storageErrors.configurationNotFound();
    return config;
  }

  private async require(tenantId: string, id: string): Promise<StorageProviderConfig> {
    const config = await this.deps.configs.findById(tenantId, id);
    if (!config) throw storageErrors.configurationNotFound();
    return config;
  }

  private async toRuntime(config: StorageProviderConfig): Promise<StorageProviderRuntimeConfig> {
    return {
      configId: config.id,
      tenantId: config.tenantId,
      providerType: config.providerType,
      bucketName: config.bucketName,
      region: config.region,
      endpoint: config.endpoint,
      basePath: config.basePath,
      credentials: config.encryptedCredentials ? await this.deps.cipher.decrypt(config.encryptedCredentials) : null,
    };
  }
}
