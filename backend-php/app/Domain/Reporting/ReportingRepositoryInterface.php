<?php

declare(strict_types=1);

namespace App\Domain\Reporting;

interface ReportingRepositoryInterface
{
    /**
     * @return ReportDefinitionEntity[]
     */
    public function listDefinitions(): array;

    public function getMetadata(string $name): ?ReportDefinitionEntity;

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function preview(array $request): array;

    /**
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function run(array $request): array;

    /**
     * @param array<string, mixed> $config
     */
    public function save(string $name, string $definitionName, array $config): SavedReportEntity;

    /**
     * @return SavedReportEntity[]
     */
    public function listSaved(): array;
}
