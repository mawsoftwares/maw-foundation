<?php

declare(strict_types=1);

namespace App\Domain\Messaging;

interface MessagingRepositoryInterface
{
    /**
     * @return EmailTemplateEntity[]
     */
    public function listTemplates(): array;

    public function findTemplateById(string $id): ?EmailTemplateEntity;

    /**
     * @param array<string, mixed> $data
     */
    public function createTemplate(array $data): EmailTemplateEntity;

    /**
     * @param array<string, mixed> $data
     */
    public function updateTemplate(string $id, array $data): EmailTemplateEntity;

    public function deleteTemplate(string $id): bool;

    /**
     * @return MessagingCredentialEntity[]
     */
    public function listCredentials(): array;

    public function findCredentialByChannel(string $channel): ?MessagingCredentialEntity;

    /**
     * @param array<string, mixed> $data
     */
    public function upsertCredential(string $channel, array $data): MessagingCredentialEntity;

    public function deleteCredential(string $channel): bool;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listLogs(): array;

    /**
     * @param array<string, mixed> $params
     * @return array{messageId: string, status: string}
     */
    public function send(string $channel, array $params): array;
}
