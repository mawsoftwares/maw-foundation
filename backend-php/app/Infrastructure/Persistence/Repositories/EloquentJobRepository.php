<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Job\JobEntity;
use App\Domain\Job\JobRepositoryInterface;
use App\Domain\Job\JobStatus;
use App\Infrastructure\Persistence\Eloquent\Models\JobModel;
use DateTimeImmutable;
use Illuminate\Support\Str;

final class EloquentJobRepository implements JobRepositoryInterface
{
    /**
     * @return JobEntity[]
     */
    public function list(?JobStatus $status = null, ?string $type = null): array
    {
        $query = JobModel::query();

        if ($status !== null) {
            $query->where('status', $status->value);
        }

        if ($type !== null) {
            $query->where('type', $type);
        }

        return $query->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (JobModel $m) => $this->toEntity($m))
            ->all();
    }

    public function findById(string $id): ?JobEntity
    {
        $model = JobModel::find($id);

        return $model ? $this->toEntity($model) : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(
        string $type,
        array $payload,
        int $priority = 0,
        ?DateTimeImmutable $scheduledAt = null,
    ): JobEntity {
        $model = JobModel::create([
            'id' => Str::uuid()->toString(),
            'type' => $type,
            'status' => JobStatus::PENDING->value,
            'payload' => $payload,
            'result' => null,
            'error' => null,
            'attempts' => 0,
            'max_retries' => 3,
            'priority' => $priority,
            'scheduled_at' => $scheduledAt?->format('Y-m-d H:i:s'),
            'started_at' => null,
            'completed_at' => null,
            'created_at' => now(),
        ]);

        return $this->toEntity($model);
    }

    private function toEntity(JobModel $model): JobEntity
    {
        return new JobEntity(
            id: $model->id,
            type: $model->type,
            status: JobStatus::from($model->status),
            payload: $model->payload,
            result: $model->result,
            error: $model->error,
            attempts: (int) $model->attempts,
            maxRetries: (int) $model->max_retries,
            priority: (int) $model->priority,
            scheduledAt: $model->scheduled_at ? new DateTimeImmutable($model->scheduled_at->toIso8601String()) : null,
            startedAt: $model->started_at ? new DateTimeImmutable($model->started_at->toIso8601String()) : null,
            completedAt: $model->completed_at ? new DateTimeImmutable($model->completed_at->toIso8601String()) : null,
            createdAt: new DateTimeImmutable($model->created_at->toIso8601String()),
        );
    }
}
