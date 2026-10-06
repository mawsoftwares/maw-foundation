<?php

declare(strict_types=1);

namespace App\Storage\Services;

use App\Storage\Core\Actor;
use App\Storage\Core\Errors;
use App\Storage\Core\StorageFolder;
use App\Storage\Repositories\FolderRepository;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class FolderService
{
    private const MAX_DEPTH = 32;

    public function __construct(
        private readonly FolderRepository $folders,
        private readonly ConfigurationService $configurations,
    ) {}

    /**
     * @param array<string, mixed> $query validated by Validator::listQuery()
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    public function list(string $tenantId, array $query): array
    {
        if ($query['parentId'] !== null) {
            $this->require($tenantId, $query['parentId']);
        }
        $result = $this->folders->list($tenantId, $query);

        return ['items' => array_map(static fn (StorageFolder $f): array => $f->toView(), $result['items']), 'total' => $result['total']];
    }

    /** Tenant-scoped lookup; a folder owned by another tenant is indistinguishable from a missing one. */
    public function require(string $tenantId, string $id): StorageFolder
    {
        return $this->folders->findById($tenantId, $id) ?? throw Errors::folderNotFound();
    }

    /**
     * @param array{name: string, parentId: ?string, storageConfigId?: string} $input
     * @return array<string, mixed>
     */
    public function create(Actor $actor, array $input): array
    {
        $tenantId = $actor->tenantId;
        $parent = $input['parentId'] === null ? null : $this->require($tenantId, $input['parentId']);
        $requestedConfig = $input['storageConfigId'] ?? null;

        if ($parent !== null && $requestedConfig !== null && $requestedConfig !== $parent->storageConfigId) {
            throw Errors::invalidInput('A child folder must use its parent folder storage configuration');
        }
        $configId = $parent->storageConfigId
            ?? ($requestedConfig !== null ? $this->configurations->requireActive($tenantId, $requestedConfig)->id : $this->configurations->requireDefault($tenantId)->id);

        $path = self::joinPath($parent, $input['name']);
        $this->assertDepth($path);
        if ($this->folders->findSibling($tenantId, $configId, $input['parentId'], $input['name']) !== null) {
            throw Errors::conflict('A folder with this name already exists here');
        }

        $folder = $this->folders->create([
            'id' => (string) Str::uuid(),
            'tenantId' => $tenantId,
            'storageConfigId' => $configId,
            'parentId' => $input['parentId'],
            'name' => $input['name'],
            'path' => $path,
            'createdBy' => $actor->userId,
        ]);
        Log::info('Folder created', ['tenantId' => $tenantId, 'folderId' => $folder->id]);

        return $folder->toView();
    }

    /**
     * Rename and/or move. `$patch` holds only the keys the client sent.
     *
     * @param array{name?: string, parentId?: ?string} $patch
     * @return array<string, mixed>
     */
    public function update(string $tenantId, string $id, array $patch): array
    {
        $folder = $this->require($tenantId, $id);
        $parentId = array_key_exists('parentId', $patch) ? $patch['parentId'] : $folder->parentId;
        $name = $patch['name'] ?? $folder->name;
        $parent = $parentId === null ? null : $this->require($tenantId, $parentId);

        if ($parent !== null) {
            if ($parent->storageConfigId !== $folder->storageConfigId) {
                throw Errors::invalidInput('A folder cannot be moved to a different storage configuration');
            }
            if (in_array($folder->id, $this->folders->ancestorIds($tenantId, $parent->id), true)) {
                throw Errors::conflict('A folder cannot be moved into itself or one of its subfolders');
            }
        }

        $sibling = $this->folders->findSibling($tenantId, $folder->storageConfigId, $parentId, $name);
        if ($sibling !== null && $sibling->id !== $folder->id) {
            throw Errors::conflict('A folder with this name already exists here');
        }

        $path = self::joinPath($parent, $name);
        $this->assertDepth($path);
        $updated = $this->folders->update($tenantId, $id, $name, $parentId, $path) ?? throw Errors::folderNotFound();
        if ($path !== $folder->path) {
            $this->folders->rewriteDescendantPaths($tenantId, $folder->path, $path);
        }
        Log::info('Folder updated', ['tenantId' => $tenantId, 'folderId' => $id]);

        return $updated->toView();
    }

    public function delete(string $tenantId, string $id): void
    {
        $this->require($tenantId, $id);
        $children = $this->folders->countChildren($tenantId, $id);
        if ($children['folders'] > 0 || $children['files'] > 0) {
            throw Errors::conflict('Folder is not empty; delete or move its contents first');
        }
        $this->folders->softDelete($tenantId, $id);
        Log::info('Folder deleted', ['tenantId' => $tenantId, 'folderId' => $id]);
    }

    private static function joinPath(?StorageFolder $parent, string $name): string
    {
        return ($parent->path ?? '') . '/' . $name;
    }

    private function assertDepth(string $path): void
    {
        if (substr_count($path, '/') > self::MAX_DEPTH) {
            throw Errors::invalidInput('Folder nesting is too deep');
        }
    }
}
