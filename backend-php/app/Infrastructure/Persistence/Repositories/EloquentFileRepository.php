<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\File\FileEntity;
use App\Domain\File\FileRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\FileModel;
use Illuminate\Support\Str;

final class EloquentFileRepository implements FileRepositoryInterface
{
    /**
     * @return list<FileEntity>
     */
    public function list(): array
    {
        return FileModel::orderBy('created_at', 'desc')
            ->get()
            ->map(fn (FileModel $m) => $this->toEntity($m))
            ->values()
            ->all();
    }

    public function findByKey(string $key): ?FileEntity
    {
        $model = FileModel::where('key', $key)->first();

        return $model ? $this->toEntity($model) : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): FileEntity
    {
        $model = FileModel::create([
            'id' => Str::uuid()->toString(),
            'key' => $data['key'],
            'original_name' => $data['originalName'] ?? null,
            'mime_type' => $data['mimeType'],
            'size' => $data['size'],
            'category' => $data['category'] ?? null,
            'description' => $data['description'] ?? null,
            'uploaded_by' => $data['uploadedBy'] ?? null,
            'tenant_id' => $data['tenantId'] ?? null,
        ]);

        return $this->toEntity($model);
    }

    public function delete(string $key): bool
    {
        return (bool) FileModel::where('key', $key)->delete();
    }

    private function toEntity(FileModel $model): FileEntity
    {
        return new FileEntity(
            key: $model->key,
            originalName: $model->original_name,
            mimeType: $model->mime_type,
            size: (int) $model->size,
            category: $model->category,
            description: $model->description,
            uploadedBy: $model->uploaded_by,
            createdAt: $model->created_at?->toIso8601String(),
        );
    }
}
