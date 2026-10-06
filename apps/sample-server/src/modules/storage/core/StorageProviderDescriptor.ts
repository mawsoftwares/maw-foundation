import type { StorageProviderType } from '../types/storage.types';

export type ConfigFieldName = 'bucket' | 'region' | 'endpoint' | 'accountId' | 'basePath';

export interface ConfigField {
  readonly name: ConfigFieldName;
  readonly label: string;
  readonly required: boolean;
  readonly placeholder?: string;
  readonly help?: string;
  /** Regex source with one capture group, used by UIs to pre-fill this field from a stored endpoint. */
  readonly prefillFromEndpoint?: string;
}

export interface CredentialSpec {
  readonly required: boolean;
  readonly accessKeyLabel: string;
  readonly secretLabel: string;
  readonly help?: string;
}

/** Raw settings as entered by an admin. */
export interface ProviderSettingsInput {
  readonly bucket?: string | null;
  readonly region?: string | null;
  readonly endpoint?: string | null;
  readonly accountId?: string | null;
}

/** What is persisted in `maw_storage_provider_configs`. */
export interface StoredProviderSettings {
  readonly bucket: string | null;
  readonly region: string | null;
  readonly endpoint: string | null;
}

/**
 * Self-description of a provider: which settings it needs, how they map onto the stored columns,
 * and how the credential pair is labelled. Drives API validation and the admin settings screen,
 * so adding a provider never requires touching services, controllers or forms.
 */
export interface ProviderDescriptor {
  readonly type: StorageProviderType;
  readonly label: string;
  readonly description: string;
  readonly fields: readonly ConfigField[];
  /** `null` ⇒ the provider takes no credentials. */
  readonly credentials: CredentialSpec | null;
  /** Validates the entered settings and returns the stored form. Throws `STORAGE_INVALID_INPUT`. */
  normalize(input: ProviderSettingsInput): StoredProviderSettings;
}
