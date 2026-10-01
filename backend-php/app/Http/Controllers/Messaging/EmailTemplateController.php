<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Domain\Messaging\MessagingRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class EmailTemplateController extends Controller
{
    public function __construct(
        private readonly MessagingRepositoryInterface $messaging,
    ) {}

    public function index(): JsonResponse
    {
        $templates = $this->messaging->listTemplates();

        return new JsonResponse([
            'data' => array_map(fn ($t) => $t->toResponse(), $templates),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $template = $this->messaging->findTemplateById($id);

        if (! $template) {
            throw new NotFoundException('Email template not found');
        }

        return new JsonResponse([
            'data' => $template->toResponse(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'subject' => 'required|string',
            'body' => 'required|string',
            'channel' => 'sometimes|string',
            'variables' => 'sometimes|array',
            'isActive' => 'sometimes|boolean',
        ]);

        $template = $this->messaging->createTemplate($request->only([
            'name', 'subject', 'body', 'channel', 'variables', 'isActive',
        ]));

        return new JsonResponse([
            'data' => $template->toResponse(),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string',
            'subject' => 'sometimes|string',
            'body' => 'sometimes|string',
            'channel' => 'sometimes|string',
            'variables' => 'sometimes|array',
            'isActive' => 'sometimes|boolean',
        ]);

        $template = $this->messaging->updateTemplate($id, $request->only([
            'name', 'subject', 'body', 'channel', 'variables', 'isActive',
        ]));

        return new JsonResponse([
            'data' => $template->toResponse(),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $deleted = $this->messaging->deleteTemplate($id);

        if (! $deleted) {
            throw new NotFoundException('Email template not found');
        }

        return new JsonResponse(['success' => true]);
    }
}
