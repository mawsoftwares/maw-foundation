import { storageErrors } from './storage.errors';
import type { ProviderDescriptor } from './StorageProviderDescriptor';
import type { StorageProvider } from './StorageProvider';
import type { StorageCredentials, StorageProviderType } from '../types/storage.types';

/** Decrypted, provider-ready view of a tenant configuration. Lives only in memory. */
export interface StorageProviderRuntimeConfig {
  readonly configId: string;
  readonly tenantId: string;
  readonly providerType: StorageProviderType;
  readonly bucketName: string | null;
  readonly region: string | null;
  readonly endpoint: string | null;
  readonly basePath: string;
  readonly credentials: StorageCredentials | null;
}

export type StorageProviderCreator = (config: StorageProviderRuntimeConfig) => StorageProvider;

/**
 * Registry of provider constructors. Adding a provider = `register('r2', creator)`;
 * no business-logic file changes.
 */
export class StorageProviderFactory {
  private readonly creators = new Map<string, StorageProviderCreator>();
  private readonly descriptorsByType = new Map<string, ProviderDescriptor>();

  /** One call adds a provider: how to build it, and how it describes its own settings. */
  register(type: string, creator: StorageProviderCreator, descriptor: ProviderDescriptor): this {
    this.creators.set(type, creator);
    this.descriptorsByType.set(type, descriptor);
    return this;
  }

  descriptor(type: string): ProviderDescriptor {
    const found = this.descriptorsByType.get(type);
    if (!found) throw storageErrors.providerNotFound(type);
    return found;
  }

  descriptors(): ProviderDescriptor[] {
    return [...this.descriptorsByType.values()];
  }

  isSupported(type: string): boolean {
    return this.creators.has(type);
  }

  supportedTypes(): string[] {
    return [...this.creators.keys()];
  }

  get(config: StorageProviderRuntimeConfig): StorageProvider {
    const creator = this.creators.get(config.providerType);
    if (!creator) throw storageErrors.providerNotFound(config.providerType);
    return creator(config);
  }
}
