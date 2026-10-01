<?php

declare(strict_types=1);

namespace App\Domain\File;

interface FileRepositoryInterface
{
    /**
     * @return list<FileEntity>
     */
    public function list(): array;

    public function findByKey(string $key): ?FileEntity;

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): FileEntity;

    public function delete(string $key): bool;
}
