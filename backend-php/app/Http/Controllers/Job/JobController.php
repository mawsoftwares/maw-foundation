<?php

declare(strict_types=1);

namespace App\Http\Controllers\Job;

use App\Domain\Job\JobRepositoryInterface;
use App\Domain\Job\JobStatus;
use App\Domain\Shared\Exceptions\NotFoundException;
use DateTimeImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class JobController extends Controller
{
    public function __construct(
        private readonly JobRepositoryInterface $jobs,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status')
            ? JobStatus::from((string) $request->query('status'))
            : null;

        $type = $request->query('type')
            ? (string) $request->query('type')
            : null;

        $jobs = $this->jobs->list($status, $type);

        return new JsonResponse([
            'data' => array_map(fn ($j) => $j->toResponse(), $jobs),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $job = $this->jobs->findById($id);

        if (! $job) {
            throw new NotFoundException('Job not found');
        }

        return new JsonResponse($job->toResponse());
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|string',
            'payload' => 'required|array',
            'priority' => 'sometimes|integer|min:0',
            'scheduledAt' => 'sometimes|date',
        ]);

        $scheduledAt = $request->input('scheduledAt')
            ? new DateTimeImmutable((string) $request->input('scheduledAt'))
            : null;

        $job = $this->jobs->create(
            type: (string) $request->input('type'),
            payload: (array) $request->input('payload'),
            priority: (int) $request->input('priority', 0),
            scheduledAt: $scheduledAt,
        );

        return new JsonResponse([
            'id' => $job->id,
            'status' => $job->status->value,
        ], 201);
    }
}
