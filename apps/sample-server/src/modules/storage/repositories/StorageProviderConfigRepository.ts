import type { PgPool } from '@mawsoftwares/database';
import type { StorageProviderConfig, StorageProviderRecord, StorageProviderType } from '../types/storage.types';
import { toIso } from './pg.util';

export interface NewProviderConfig {
  readonly id: string;
  readonly tenantId: string;
  readonly providerId: string;
  readonly name: string;
  readonly bucketName: string | null;
  readonly region: string | null;
  readonly endpoint: string | null;
  readonly basePath: string;
  readonly encryptedCredentials: string | null;
}

export interface ProviderConfigPatch {
  readonly name?: string;
  readonly bucketName?: string | null;
  readonly region?: string | null;
  readonly endpoint?: string | null;
  readonly basePath?: string;
  readonly encryptedCredentials?: string;
  readonly isActive?: boolean;
}

export interface IStorageProviderConfigRepository {
  findProviderByType(type: StorageProviderType): Promise<StorageProviderRecord | null>;
  list(tenantId: string): Promise<StorageProviderConfig[]>;
  findById(tenantId: string, id: string): Promise<StorageProviderConfig | null>;
  findDefault(tenantId: string): Promise<StorageProviderConfig | null>;
  create(input: NewProviderConfig): Promise<StorageProviderConfig>;
  update(tenantId: string, id: string, patch: ProviderConfigPatch): Promise<StorageProviderConfig | null>;
  /** Atomically makes `id` the tenant's only default. */
  setDefault(tenantId: string, id: string): Promise<void>;
  delete(tenantId: string, id: string): Promise<boolean>;
  countReferences(tenantId: string, id: string): Promise<number>;
}

interface ConfigRow {
  id: string;
  tenant_id: string;
  provider_id: string;
  provider_type: StorageProviderType;
  name: string;
  bucket_name: string | null;
  region: string | null;
  endpoint: string | null;
  base_path: string;
  encrypted_credentials: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

const SELECT = `
  SELECT c.id, c.tenant_id, c.provider_id, p.provider_type, c.name, c.bucket_name, c.region,
         c.endpoint, c.base_path, c.encrypted_credentials, c.is_default, c.is_active,
         c.created_at, c.updated_at
    FROM maw_storage_provider_configs c
    JOIN maw_storage_providers p ON p.id = c.provider_id`;

function toConfig(row: ConfigRow): StorageProviderConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    providerId: row.provider_id,
    providerType: row.provider_type,
    name: row.name,
    bucketName: row.bucket_name,
    region: row.region,
    endpoint: row.endpoint,
    basePath: row.base_path,
    encryptedCredentials: row.encrypted_credentials,
    isDefault: row.is_default,
    isActive: row.is_active,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export class PgStorageProviderConfigRepository implements IStorageProviderConfigRepository {
  constructor(private readonly db: PgPool) {}

  async findProviderByType(type: StorageProviderType): Promise<StorageProviderRecord | null> {
    const { rows } = await this.db.query<{ id: string; code: string; name: string; provider_type: StorageProviderType; is_active: boolean }>(
      `SELECT id, code, name, provider_type, is_active FROM maw_storage_providers
        WHERE provider_type = $1 AND is_active LIMIT 1`,
      [type],
    );
    const row = rows[0];
    return row ? { id: row.id, code: row.code, name: row.name, providerType: row.provider_type, isActive: row.is_active } : null;
  }

  async list(tenantId: string): Promise<StorageProviderConfig[]> {
    const { rows } = await this.db.query<ConfigRow>(`${SELECT} WHERE c.tenant_id = $1 ORDER BY c.is_default DESC, c.name`, [tenantId]);
    return rows.map(toConfig);
  }

  async findById(tenantId: string, id: string): Promise<StorageProviderConfig | null> {
    const { rows } = await this.db.query<ConfigRow>(`${SELECT} WHERE c.tenant_id = $1 AND c.id = $2`, [tenantId, id]);
    return rows[0] ? toConfig(rows[0]) : null;
  }

  async findDefault(tenantId: string): Promise<StorageProviderConfig | null> {
    const { rows } = await this.db.query<ConfigRow>(
      `${SELECT} WHERE c.tenant_id = $1 AND c.is_default AND c.is_active LIMIT 1`,
      [tenantId],
    );
    return rows[0] ? toConfig(rows[0]) : null;
  }

  async create(input: NewProviderConfig): Promise<StorageProviderConfig> {
    await this.db.query(
      `INSERT INTO maw_storage_provider_configs
         (id, tenant_id, provider_id, name, bucket_name, region, endpoint, base_path, encrypted_credentials)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [input.id, input.tenantId, input.providerId, input.name, input.bucketName, input.region, input.endpoint, input.basePath, input.encryptedCredentials],
    );
    return (await this.findById(input.tenantId, input.id))!;
  }

  async update(tenantId: string, id: string, patch: ProviderConfigPatch): Promise<StorageProviderConfig | null> {
    const columns: Record<keyof ProviderConfigPatch, string> = {
      name: 'name',
      bucketName: 'bucket_name',
      region: 'region',
      endpoint: 'endpoint',
      basePath: 'base_path',
      encryptedCredentials: 'encrypted_credentials',
      isActive: 'is_active',
    };
    const sets: string[] = [];
    const values: unknown[] = [tenantId, id];
    for (const [key, column] of Object.entries(columns) as Array<[keyof ProviderConfigPatch, string]>) {
      if (patch[key] !== undefined) {
        values.push(patch[key]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    if (sets.length > 0) {
      await this.db.query(
        `UPDATE maw_storage_provider_configs SET ${sets.join(', ')}, updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
        values,
      );
    }
    return this.findById(tenantId, id);
  }

  async setDefault(tenantId: string, id: string): Promise<void> {
    await this.db.query(
      `UPDATE maw_storage_provider_configs SET is_default = (id = $2), updated_at = NOW()
        WHERE tenant_id = $1 AND (is_default OR id = $2)`,
      [tenantId, id],
    );
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `DELETE FROM maw_storage_provider_configs WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id],
    );
    return (rowCount ?? 0) > 0;
  }

  async countReferences(tenantId: string, id: string): Promise<number> {
    const { rows } = await this.db.query<{ n: string }>(
      `SELECT (SELECT COUNT(*) FROM maw_storage_folders WHERE tenant_id = $1 AND storage_config_id = $2)
            + (SELECT COUNT(*) FROM maw_storage_files   WHERE tenant_id = $1 AND storage_config_id = $2) AS n`,
      [tenantId, id],
    );
    return Number(rows[0]?.n ?? 0);
  }
}
