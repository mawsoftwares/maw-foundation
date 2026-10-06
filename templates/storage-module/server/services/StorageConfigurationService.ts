import { randomUUID } from 'node:crypto';
import { createLogger } from '@mawsoftwares/sdk';
import type { ConfigFieldName, ProviderDescriptor } from '../core/StorageProviderDescriptor';
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

  /** Providers this server can use, with the settings each one needs (drives the admin form). */
  listProviders(): Array<Omit<ProviderDescriptor, 'normalize'>> {
    return this.deps.factory.descriptors().map(({ type, label, description, fields, credentials }) => ({ type, label, description, fields, credentials }));
  }

  async create(tenantId: string, input: CreateConfigurationInput): Promise<StorageConfigurationView> {
    const descriptor = this.deps.factory.descriptor(input.provider);
    const provider = await this.deps.configs.findProviderByType(input.provider);
    if (!provider) throw storageErrors.providerNotFound(input.provider);
    this.assertAllowedFields(descriptor, input);
    this.assertCredentials(descriptor, input.credentials ?? null, true);
    const settings = descriptor.normalize(input);

    const created = await this.deps.configs.create({
      id: randomUUID(),
      tenantId,
      providerId: provider.id,
      name: input.name,
      bucketName: settings.bucket,
      region: settings.region,
      endpoint: settings.endpoint,
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
    const descriptor = this.deps.factory.descriptor(existing.providerType);
    this.assertAllowedFields(descriptor, input);
    this.assertCredentials(descriptor, input.credentials ?? null, false);
    if (input.isActive === false && existing.isDefault) {
      throw storageErrors.conflict('Choose another default configuration before deactivating this one');
    }

    const touchesSettings = ['bucket', 'region', 'endpoint', 'accountId'].some((k) => k in input);
    const settings = touchesSettings
      ? descriptor.normalize({
          bucket: input.bucket === undefined ? existing.bucketName : input.bucket,
          region: input.region === undefined ? existing.region : input.region,
          // A newly entered account id must win over the endpoint derived from the previous one.
          endpoint: input.endpoint !== undefined ? input.endpoint : input.accountId ? null : existing.endpoint,
          accountId: input.accountId,
        })
      : undefined;

    await this.deps.configs.update(tenantId, id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(settings ? { bucketName: settings.bucket, region: settings.region, endpoint: settings.endpoint } : {}),
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

  /** Rejects settings the provider does not use (e.g. a bucket for local disk). */
  private assertAllowedFields(descriptor: ProviderDescriptor, input: object): void {
    const allowed = new Set<ConfigFieldName>(descriptor.fields.map((f) => f.name));
    const entered = input as Partial<Record<ConfigFieldName, string | null>>;
    for (const name of ['bucket', 'region', 'endpoint', 'accountId'] as const) {
      const value = entered[name];
      // `region` is derived by some providers (R2 → "auto"), so it is tolerated, never required, there.
      if (typeof value === 'string' && value.trim() !== '' && !allowed.has(name) && name !== 'region') {
        throw storageErrors.invalidInput(`${descriptor.label} does not use "${name}"`);
      }
    }
  }

  private assertCredentials(descriptor: ProviderDescriptor, credentials: object | null, creating: boolean): void {
    if (!descriptor.credentials && credentials) throw storageErrors.invalidInput(`${descriptor.label} does not use credentials`);
    if (creating && descriptor.credentials?.required && !credentials) {
      throw storageErrors.invalidInput(`${descriptor.credentials.accessKeyLabel} and ${descriptor.credentials.secretLabel} are required`);
    }
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
