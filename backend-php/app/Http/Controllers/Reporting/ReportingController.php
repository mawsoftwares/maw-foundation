<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reporting;

use App\Domain\Reporting\ReportingRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class ReportingController extends Controller
{
    public function __construct(
        private readonly ReportingRepositoryInterface $reporting,
    ) {}

    public function definitions(): JsonResponse
    {
        $definitions = $this->reporting->listDefinitions();

        return new JsonResponse([
            'data' => array_map(fn ($d) => $d->toSummary(), $definitions),
        ]);
    }

    public function metadata(string $name): JsonResponse
    {
        $definition = $this->reporting->getMetadata($name);

        if (! $definition) {
            throw new NotFoundException('Report definition not found');
        }

        return new JsonResponse($definition->toMetadata());
    }

    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'definitionName' => 'required|string',
            'filters' => 'sometimes|array',
            'sorting' => 'sometimes|array',
            'grouping' => 'sometimes|array',
            'pagination' => 'sometimes|array',
            'dateRange' => 'sometimes|array',
        ]);

        $result = $this->reporting->preview($request->all());

        return new JsonResponse($result);
    }

    public function run(Request $request): JsonResponse
    {
        $request->validate([
            'definitionName' => 'required|string',
            'filters' => 'sometimes|array',
            'sorting' => 'sometimes|array',
            'grouping' => 'sometimes|array',
            'pagination' => 'sometimes|array',
            'dateRange' => 'sometimes|array',
        ]);

        $result = $this->reporting->run($request->all());

        return new JsonResponse($result);
    }

    public function save(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'definitionName' => 'required|string',
            'config' => 'required|array',
        ]);

        $saved = $this->reporting->save(
            name: (string) $request->input('name'),
            definitionName: (string) $request->input('definitionName'),
            config: (array) $request->input('config'),
        );

        return new JsonResponse([
            'id' => $saved->id,
        ], 201);
    }

    public function savedReports(): JsonResponse
    {
        $reports = $this->reporting->listSaved();

        return new JsonResponse([
            'data' => array_map(fn ($r) => $r->toSummary(), $reports),
        ]);
    }
}
