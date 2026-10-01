<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Tenant\TenantEntity;
use App\Domain\Tenant\TenantRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\TenantModel;
use Illuminate\Support\Str;

final class EloquentTenantRepository implements TenantRepositoryInterface
{
    /**
     * @return list<TenantEntity>
     */
    public function list(): array
    {
        return TenantModel::orderBy('name')
            ->get()
            ->map(fn (TenantModel $m) => $this->toEntity($m))
            ->values()
            ->all();
    }

    public function findById(string $id): ?TenantEntity
    {
        $model = TenantModel::find($id);

        return $model ? $this->toEntity($model) : null;
    }

    /**
     * @param array<string, mixed>|null $settings
     */
    public function create(string $name, string $slug, ?string $domain, ?array $settings): TenantEntity
    {
        $model = TenantModel::create([
            'id' => Str::uuid()->toString(),
            'name' => $name,
            'slug' => $slug,
            'domain' => $domain,
            'is_active' => true,
            'settings' => $settings,
        ]);

        return $this->toEntity($model);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(string $id, array $data): TenantEntity
    {
        $model = TenantModel::find($id);
        if (! $model) {
            throw new NotFoundException('Tenant', $id);
        }

        $updateData = [];
        if (array_key_exists('name', $data)) {
            $updateData['name'] = $data['name'];
        }
        if (array_key_exists('domain', $data)) {
            $updateData['domain'] = $data['domain'];
        }
        if (array_key_exists('isActive', $data)) {
            $updateData['is_active'] = $data['isActive'];
        }
        if (array_key_exists('settings', $data)) {
            $updateData['settings'] = $data['settings'];
        }

        if ($updateData !== []) {
            $model->update($updateData);
        }

        return $this->toEntity($model->fresh() ?? $model);
    }

    public function delete(string $id): bool
    {
        return (bool) TenantModel::where('id', $id)->delete();
    }

    private function toEntity(TenantModel $model): TenantEntity
    {
        return new TenantEntity(
            id: $model->id,
            name: $model->name,
            slug: $model->slug,
            domain: $model->domain,
            isActive: (bool) $model->is_active,
            settings: $model->settings,
            createdAt: $model->created_at ? new \DateTimeImmutable($model->created_at->toIso8601String()) : null,
            updatedAt: $model->updated_at ? new \DateTimeImmutable($model->updated_at->toIso8601String()) : null,
        );
    }
}
