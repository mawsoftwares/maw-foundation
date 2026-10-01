<?php

declare(strict_types=1);

namespace App\Domain\Menu;

interface MenuRepositoryInterface
{
    /**
     * @return list<MenuEntity>
     */
    public function list(): array;

    public function findById(string $id): ?MenuEntity;

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): MenuEntity;

    /**
     * @param array<string, mixed> $data
     */
    public function update(string $id, array $data): MenuEntity;

    public function delete(string $id): bool;

    /**
     * @return list<MenuEntity>
     */
    public function getTree(): array;

    /**
     * @param list<array{id: string, sortOrder: int}> $items
     */
    public function reorder(array $items): void;
}
