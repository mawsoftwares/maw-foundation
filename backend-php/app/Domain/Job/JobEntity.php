<?php

declare(strict_types=1);

namespace App\Domain\Job;

use DateTimeImmutable;

final readonly class JobEntity
{
    /**
     * @param array<string, mixed>|null $payload
     * @param array<string, mixed>|null $result
     */
    public function __construct(
        public string $id,
        public string $type,
        public JobStatus $status,
        public ?array $payload,
        public ?array $result,
        public ?string $error,
        public int $attempts,
        public int $maxRetries,
        public int $priority,
        public ?DateTimeImmutable $scheduledAt,
        public ?DateTimeImmutable $startedAt,
        public ?DateTimeImmutable $completedAt,
        public DateTimeImmutable $createdAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'status' => $this->status->value,
            'payload' => $this->payload,
            'result' => $this->result,
            'error' => $this->error,
            'attempts' => $this->attempts,
            'maxRetries' => $this->maxRetries,
            'priority' => $this->priority,
            'scheduledAt' => $this->scheduledAt?->format(DateTimeImmutable::ATOM),
            'startedAt' => $this->startedAt?->format(DateTimeImmutable::ATOM),
            'completedAt' => $this->completedAt?->format(DateTimeImmutable::ATOM),
            'createdAt' => $this->createdAt->format(DateTimeImmutable::ATOM),
        ];
    }
}
