<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageAttachment;
use Illuminate\Support\Facades\DB;

final class DbAttachmentRepository implements AttachmentRepository
{
    use DbSupport;

    private const COLUMNS = 'id, tenant_id, file_id, entity_type, entity_id, category, created_by, created_at';

    /** @param array<string, mixed> $row */
    public function create(array $row): StorageAttachment
    {
        DB::insert(
            'INSERT INTO maw_storage_attachments (tenant_id, file_id, entity_type, entity_id, category, created_by)
             VALUES (?,?,?,?,?,?) ON CONFLICT (tenant_id, file_id, entity_type, entity_id, category) DO NOTHING',
            [$row['tenantId'], $row['fileId'], $row['entityType'], $row['entityId'], $row['category'], $row['createdBy']],
        );
        $found = DB::selectOne(
            'SELECT ' . self::COLUMNS . ' FROM maw_storage_attachments WHERE tenant_id = ? AND file_id = ? AND entity_type = ? AND entity_id = ? AND category = ?',
            [$row['tenantId'], $row['fileId'], $row['entityType'], $row['entityId'], $row['category']],
        );

        return $this->map($found ?? throw new \RuntimeException('Attachment vanished after insert'));
    }

    public function listByEntity(string $tenantId, string $entityType, string $entityId, ?string $category = null): array
    {
        $sql = 'SELECT ' . self::COLUMNS . ' FROM maw_storage_attachments WHERE tenant_id = ? AND entity_type = ? AND entity_id = ?';
        $values = [$tenantId, $entityType, $entityId];
        if ($category !== null && $category !== '') {
            $sql .= ' AND category = ?';
            $values[] = $category;
        }

        return array_values(array_map($this->map(...), DB::select($sql . ' ORDER BY created_at', $values)));
    }

    public function delete(string $tenantId, string $id): bool
    {
        return DB::delete('DELETE FROM maw_storage_attachments WHERE tenant_id = ? AND id = ?', [$tenantId, $id]) > 0;
    }

    private function map(\stdClass $r): StorageAttachment
    {
        return new StorageAttachment($r->id, $r->tenant_id, $r->file_id, $r->entity_type, $r->entity_id, $r->category, $r->created_by, self::iso($r->created_at));
    }
}
