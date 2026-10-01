<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Domain\Messaging\MessagingRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class MessagingController extends Controller
{
    public function __construct(
        private readonly MessagingRepositoryInterface $messaging,
    ) {}

    public function listCredentials(): JsonResponse
    {
        $credentials = $this->messaging->listCredentials();

        return new JsonResponse([
            'data' => array_map(fn ($c) => $c->toResponse(), $credentials),
        ]);
    }

    public function showCredential(string $channel): JsonResponse
    {
        $credential = $this->messaging->findCredentialByChannel($channel);

        if (! $credential) {
            throw new NotFoundException('Credential not found');
        }

        return new JsonResponse([
            'data' => $credential->toResponse(),
        ]);
    }

    public function upsertCredential(Request $request, string $channel): JsonResponse
    {
        $request->validate([
            'provider' => 'sometimes|string',
            'isConfigured' => 'sometimes|boolean',
            'config' => 'sometimes|array',
        ]);

        $credential = $this->messaging->upsertCredential($channel, $request->only([
            'provider', 'isConfigured', 'config',
        ]));

        return new JsonResponse([
            'data' => $credential->toResponse(),
        ]);
    }

    public function deleteCredential(string $channel): JsonResponse
    {
        $deleted = $this->messaging->deleteCredential($channel);

        if (! $deleted) {
            throw new NotFoundException('Credential not found');
        }

        return new JsonResponse(['success' => true]);
    }

    public function listLogs(): JsonResponse
    {
        $logs = $this->messaging->listLogs();

        return new JsonResponse([
            'data' => $logs,
        ]);
    }

    public function sendEmail(Request $request): JsonResponse
    {
        $request->validate([
            'to' => 'required|email',
            'subject' => 'required|string',
            'body' => 'required|string',
            'templateId' => 'sometimes|string',
        ]);

        $result = $this->messaging->send('email', $request->all());

        return new JsonResponse($result);
    }

    public function sendSms(Request $request): JsonResponse
    {
        $request->validate([
            'to' => 'required|string',
            'message' => 'required|string',
        ]);

        $result = $this->messaging->send('sms', $request->all());

        return new JsonResponse($result);
    }

    public function sendWhatsapp(Request $request): JsonResponse
    {
        $request->validate([
            'to' => 'required|string',
            'message' => 'required|string',
        ]);

        $result = $this->messaging->send('whatsapp', $request->all());

        return new JsonResponse($result);
    }
}
