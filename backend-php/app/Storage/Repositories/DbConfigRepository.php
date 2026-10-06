<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageConfig;
use Illuminate\Support\Facades\DB;

final class DbConfigRepository implements ConfigRepository
{
    use DbSupport;

    private const SELECT = 'SELECT c.id, c.tenant_id, c.provider_id, p.provider_type, c.name, c.bucket_name, c.region,
        c.endpoint, c.base_path, c.encrypted_credentials, c.is_default, c.is_active, c.created_at, c.updated_at
        FROM maw_storage_provider_configs c JOIN maw_storage_providers p ON p.id = c.provider_id';

    public function findProviderByType(string $type): ?array
    {
        $row = DB::selectOne('SELECT id, code, name, provider_type, is_active FROM maw_storage_providers WHERE provider_type = ? AND is_active LIMIT 1', [$type]);

        return $row === null ? null : ['id' => $row->id, 'code' => $row->code, 'name' => $row->name, 'providerType' => $row->provider_type, 'isActive' => (bool) $row->is_active];
    }

    public function list(string $tenantId): array
    {
        return array_values(array_map($this->map(...), DB::select(self::SELECT . ' WHERE c.tenant_id = ? ORDER BY c.is_default DESC, c.name', [$tenantId])));
    }

    public function findById(string $tenantId, string $id): ?StorageConfig
    {
        $row = DB::selectOne(self::SELECT . ' WHERE c.tenant_id = ? AND c.id = ?', [$tenantId, $id]);

        return $row === null ? null : $this->map($row);
    }

    public function findDefault(string $tenantId): ?StorageConfig
    {
        $row = DB::selectOne(self::SELECT . ' WHERE c.tenant_id = ? AND c.is_default AND c.is_active LIMIT 1', [$tenantId]);

        return $row === null ? null : $this->map($row);
    }

    public function create(array $row): StorageConfig
    {
        DB::insert(
            'INSERT INTO maw_storage_provider_configs (id, tenant_id, provider_id, name, bucket_name, region, endpoint, base_path, encrypted_credentials)
             VALUES (?,?,?,?,?,?,?,?,?)',
            [$row['id'], $row['tenantId'], $row['providerId'], $row['name'], $row['bucketName'], $row['region'], $row['endpoint'], $row['basePath'], $row['encryptedCredentials']],
        );

        return $this->findById($row['tenantId'], $row['id']) ?? throw new \RuntimeException('Configuration vanished after insert');
    }

    public function update(string $tenantId, string $id, array $patch): ?StorageConfig
    {
        $columns = [
            'name' => 'name', 'bucketName' => 'bucket_name', 'region' => 'region', 'endpoint' => 'endpoint',
            'basePath' => 'base_path', 'encryptedCredentials' => 'encrypted_credentials', 'isActive' => 'is_active',
        ];
        $sets = [];
        $values = [];
        foreach ($columns as $key => $column) {
            if (array_key_exists($key, $patch)) {
                $sets[] = "{$column} = ?";
                $values[] = $patch[$key];
            }
        }
        if ($sets !== []) {
            DB::update(
                'UPDATE maw_storage_provider_configs SET ' . implode(', ', $sets) . ', updated_at = NOW() WHERE tenant_id = ? AND id = ?',
                [...$values, $tenantId, $id],
            );
        }

        return $this->findById($tenantId, $id);
    }

    public function setDefault(string $tenantId, string $id): void
    {
        DB::update(
            'UPDATE maw_storage_provider_configs SET is_default = (id = ?), updated_at = NOW() WHERE tenant_id = ? AND (is_default OR id = ?)',
            [$id, $tenantId, $id],
        );
    }

    public function delete(string $tenantId, string $id): bool
    {
        return DB::delete('DELETE FROM maw_storage_provider_configs WHERE tenant_id = ? AND id = ?', [$tenantId, $id]) > 0;
    }

    public function countReferences(string $tenantId, string $id): int
    {
        $row = DB::selectOne(
            'SELECT (SELECT COUNT(*) FROM maw_storage_folders WHERE tenant_id = ? AND storage_config_id = ?)
                  + (SELECT COUNT(*) FROM maw_storage_files   WHERE tenant_id = ? AND storage_config_id = ?) AS n',
            [$tenantId, $id, $tenantId, $id],
        );

        return (int) ($row->n ?? 0);
    }

    private function map(\stdClass $r): StorageConfig
    {
        return new StorageConfig(
            $r->id, $r->tenant_id, $r->provider_id, $r->provider_type, $r->name, $r->bucket_name, $r->region, $r->endpoint,
            $r->base_path, $r->encrypted_credentials, (bool) $r->is_default, (bool) $r->is_active,
            self::iso($r->created_at), self::iso($r->updated_at),
        );
    }
}
