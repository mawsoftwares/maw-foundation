import { storageErrors } from './storage.errors';
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

  register(type: string, creator: StorageProviderCreator): this {
    this.creators.set(type, creator);
    return this;
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
