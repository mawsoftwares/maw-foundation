<?php

declare(strict_types=1);

namespace App\Domain\Job;

interface JobRepositoryInterface
{
    /**
     * @return JobEntity[]
     */
    public function list(?JobStatus $status = null, ?string $type = null): array;

    public function findById(string $id): ?JobEntity;

    /**
     * @param array<string, mixed> $payload
     */
    public function create(
        string $type,
        array $payload,
        int $priority = 0,
        ?\DateTimeImmutable $scheduledAt = null,
    ): JobEntity;
}
