<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Menu\MenuEntity;
use App\Domain\Menu\MenuRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Infrastructure\Persistence\Eloquent\Models\MenuModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class EloquentMenuRepository implements MenuRepositoryInterface
{
    /**
     * @return list<MenuEntity>
     */
    public function list(): array
    {
        return MenuModel::orderBy('sort_order')
            ->get()
            ->map(fn (MenuModel $m) => $this->toEntity($m))
            ->values()
            ->all();
    }

    public function findById(string $id): ?MenuEntity
    {
        $model = MenuModel::find($id);

        return $model ? $this->toEntity($model) : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): MenuEntity
    {
        $model = MenuModel::create([
            'id' => Str::uuid()->toString(),
            'label' => $data['label'],
            'icon' => $data['icon'] ?? null,
            'path' => $data['path'] ?? null,
            'parent_id' => $data['parentId'] ?? null,
            'module_code' => $data['moduleCode'] ?? null,
            'permission_code' => $data['permissionCode'] ?? null,
            'sort_order' => $data['sortOrder'] ?? 0,
            'is_active' => $data['isActive'] ?? true,
            'tenant_id' => $data['tenantId'] ?? null,
        ]);

        return $this->toEntity($model);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(string $id, array $data): MenuEntity
    {
        $model = MenuModel::find($id);
        if (! $model) {
            throw new NotFoundException('Menu not found');
        }

        $updates = [];
        $fieldMap = [
            'label' => 'label',
            'icon' => 'icon',
            'path' => 'path',
            'parentId' => 'parent_id',
            'moduleCode' => 'module_code',
            'permissionCode' => 'permission_code',
            'sortOrder' => 'sort_order',
            'isActive' => 'is_active',
        ];

        foreach ($fieldMap as $camel => $snake) {
            if (array_key_exists($camel, $data)) {
                $updates[$snake] = $data[$camel];
            }
        }

        if ($updates !== []) {
            $model->update($updates);
        }

        return $this->toEntity($model->fresh() ?? $model);
    }

    public function delete(string $id): bool
    {
        return (bool) MenuModel::where('id', $id)->delete();
    }

    /**
     * @return list<MenuEntity>
     */
    public function getTree(): array
    {
        $all = MenuModel::orderBy('sort_order')->get();

        $roots = $all->filter(fn (MenuModel $m) => $m->parent_id === null);

        return $roots->map(function (MenuModel $root) use ($all) {
            return $this->buildTree($root, $all);
        })->values()->all();
    }

    /**
     * @param list<array{id: string, sortOrder: int}> $items
     */
    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items): void {
            foreach ($items as $item) {
                MenuModel::where('id', $item['id'])->update([
                    'sort_order' => $item['sortOrder'],
                ]);
            }
        });
    }

    private function toEntity(MenuModel $model): MenuEntity
    {
        return new MenuEntity(
            id: $model->id,
            label: $model->label,
            icon: $model->icon,
            path: $model->path,
            parentId: $model->parent_id,
            moduleCode: $model->module_code,
            permissionCode: $model->permission_code,
            sortOrder: (int) $model->sort_order,
            isActive: (bool) $model->is_active,
        );
    }

    /**
     * @param \Illuminate\Database\Eloquent\Collection<int, MenuModel> $all
     */
    private function buildTree(MenuModel $parent, $all): MenuEntity
    {
        $children = $all->filter(fn (MenuModel $m) => $m->parent_id === $parent->id);

        $childEntities = $children->map(function (MenuModel $child) use ($all) {
            return $this->buildTree($child, $all);
        })->values()->all();

        return new MenuEntity(
            id: $parent->id,
            label: $parent->label,
            icon: $parent->icon,
            path: $parent->path,
            parentId: $parent->parent_id,
            moduleCode: $parent->module_code,
            permissionCode: $parent->permission_code,
            sortOrder: (int) $parent->sort_order,
            isActive: (bool) $parent->is_active,
            children: $childEntities,
        );
    }
}
