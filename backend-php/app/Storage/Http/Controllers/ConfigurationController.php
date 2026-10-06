<?php

declare(strict_types=1);

namespace App\Storage\Http\Controllers;

use App\Storage\Http\Validator;
use App\Storage\Services\ConfigurationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;

final class ConfigurationController extends Controller
{
    use Responds;

    public function __construct(private readonly ConfigurationService $configurations) {}

    /** Available providers and the settings each needs. */
    public function providers(): JsonResponse
    {
        return $this->ok($this->configurations->listProviders());
    }

    public function index(Request $request): JsonResponse
    {
        return $this->ok($this->configurations->list($this->actor($request)->tenantId));
    }

    public function store(Request $request): JsonResponse
    {
        return $this->ok($this->configurations->create($this->actor($request)->tenantId, Validator::createConfiguration($request->json()->all())), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return $this->ok($this->configurations->update($this->actor($request)->tenantId, Validator::uuid($id, 'id'), Validator::updateConfiguration($request->json()->all())));
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->configurations->delete($this->actor($request)->tenantId, Validator::uuid($id, 'id'));

        return $this->noContent();
    }

    public function test(Request $request, string $id): JsonResponse
    {
        return $this->ok($this->configurations->test($this->actor($request)->tenantId, Validator::uuid($id, 'id')));
    }
}
