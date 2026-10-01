<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Reporting\ReportDefinitionEntity;
use App\Domain\Reporting\ReportingRepositoryInterface;
use App\Domain\Reporting\SavedReportEntity;
use App\Infrastructure\Persistence\Eloquent\Models\SavedReportModel;
use DateTimeImmutable;
use Illuminate\Support\Str;

final class EloquentReportingRepository implements ReportingRepositoryInterface
{
    /**
     * @var array<string, ReportDefinitionEntity>
     */
    private array $definitions;

    public function __construct()
    {
        $this->definitions = [
            'daily-sales' => new ReportDefinitionEntity(
                name: 'daily-sales',
                label: 'Daily Sales',
                description: 'Daily sales summary with totals and breakdowns',
                category: 'sales',
                metadata: [
                    'filters' => ['dateRange', 'category', 'paymentMethod'],
                    'columns' => ['date', 'orders', 'revenue', 'avgOrderValue'],
                    'sortable' => ['date', 'revenue', 'orders'],
                ],
            ),
            'inventory-status' => new ReportDefinitionEntity(
                name: 'inventory-status',
                label: 'Inventory Status',
                description: 'Current inventory levels and stock alerts',
                category: 'inventory',
                metadata: [
                    'filters' => ['category', 'stockLevel'],
                    'columns' => ['item', 'category', 'quantity', 'reorderLevel', 'status'],
                    'sortable' => ['item', 'quantity'],
                ],
            ),
            'staff-performance' => new ReportDefinitionEntity(
                name: 'staff-performance',
                label: 'Staff Performance',
                description: 'Staff productivity and performance metrics',
                category: 'hr',
                metadata: [
                    'filters' => ['dateRange', 'department', 'role'],
                    'columns' => ['name', 'role', 'hoursWorked', 'ordersHandled', 'rating'],
                    'sortable' => ['name', 'hoursWorked', 'ordersHandled'],
                ],
            ),
        ];
    }

    /**
     * @return ReportDefinitionEntity[]
     */
    public function listDefinitions(): array
    {
        return array_values($this->definitions);
    }

    public function getMetadata(string $name): ?ReportDefinitionEntity
    {
        return $this->definitions[$name] ?? null;
    }

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function preview(array $request): array
    {
        return [
            'definitionName' => $request['definitionName'] ?? '',
            'columns' => [],
            'rows' => [],
            'total' => 0,
        ];
    }

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function run(array $request): array
    {
        return [
            'definitionName' => $request['definitionName'] ?? '',
            'columns' => [],
            'rows' => [],
            'total' => 0,
        ];
    }

    /**
     * @param array<string, mixed> $config
     */
    public function save(string $name, string $definitionName, array $config): SavedReportEntity
    {
        $model = SavedReportModel::create([
            'id' => Str::uuid()->toString(),
            'name' => $name,
            'definition_name' => $definitionName,
            'config' => $config,
        ]);

        return $this->toEntity($model);
    }

    /**
     * @return SavedReportEntity[]
     */
    public function listSaved(): array
    {
        return SavedReportModel::orderBy('created_at', 'desc')
            ->get()
            ->map(fn (SavedReportModel $m) => $this->toEntity($m))
            ->all();
    }

    private function toEntity(SavedReportModel $model): SavedReportEntity
    {
        return new SavedReportEntity(
            id: $model->id,
            name: $model->name,
            definitionName: $model->definition_name,
            config: $model->config ?? [],
            createdAt: new DateTimeImmutable($model->created_at->toIso8601String()),
            updatedAt: $model->updated_at ? new DateTimeImmutable($model->updated_at->toIso8601String()) : null,
        );
    }
}
