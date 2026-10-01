<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Messaging\EmailTemplateEntity;
use App\Domain\Messaging\MessagingCredentialEntity;
use App\Domain\Messaging\MessagingRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Infrastructure\Persistence\Eloquent\Models\EmailTemplateModel;
use App\Infrastructure\Persistence\Eloquent\Models\MessagingCredentialModel;
use DateTimeImmutable;
use Illuminate\Support\Str;

final class EloquentMessagingRepository implements MessagingRepositoryInterface
{
    /**
     * @return EmailTemplateEntity[]
     */
    public function listTemplates(): array
    {
        return EmailTemplateModel::orderBy('created_at', 'desc')
            ->get()
            ->map(fn (EmailTemplateModel $m) => $this->toTemplateEntity($m))
            ->all();
    }

    public function findTemplateById(string $id): ?EmailTemplateEntity
    {
        $model = EmailTemplateModel::find($id);

        return $model ? $this->toTemplateEntity($model) : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createTemplate(array $data): EmailTemplateEntity
    {
        $model = EmailTemplateModel::create([
            'id' => Str::uuid()->toString(),
            'name' => $data['name'],
            'subject' => $data['subject'],
            'body' => $data['body'],
            'channel' => $data['channel'] ?? null,
            'variables' => $data['variables'] ?? null,
            'is_active' => $data['isActive'] ?? true,
        ]);

        return $this->toTemplateEntity($model);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateTemplate(string $id, array $data): EmailTemplateEntity
    {
        $model = EmailTemplateModel::find($id);

        if (! $model) {
            throw new NotFoundException('Email template not found');
        }

        $allowed = ['name', 'subject', 'body', 'channel', 'variables', 'is_active'];
        $mapped = [];

        foreach ($data as $key => $value) {
            $snakeKey = match ($key) {
                'isActive' => 'is_active',
                default => $key,
            };

            if (in_array($snakeKey, $allowed, true)) {
                $mapped[$snakeKey] = $value;
            }
        }

        $model->update($mapped);

        return $this->toTemplateEntity($model->fresh() ?? $model);
    }

    public function deleteTemplate(string $id): bool
    {
        return (bool) EmailTemplateModel::where('id', $id)->delete();
    }

    /**
     * @return MessagingCredentialEntity[]
     */
    public function listCredentials(): array
    {
        return MessagingCredentialModel::all()
            ->map(fn (MessagingCredentialModel $m) => $this->toCredentialEntity($m))
            ->all();
    }

    public function findCredentialByChannel(string $channel): ?MessagingCredentialEntity
    {
        $model = MessagingCredentialModel::find($channel);

        return $model ? $this->toCredentialEntity($model) : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function upsertCredential(string $channel, array $data): MessagingCredentialEntity
    {
        $model = MessagingCredentialModel::updateOrCreate(
            ['channel' => $channel],
            [
                'provider' => $data['provider'] ?? null,
                'is_configured' => $data['isConfigured'] ?? false,
                'config' => $data['config'] ?? null,
            ],
        );

        return $this->toCredentialEntity($model);
    }

    public function deleteCredential(string $channel): bool
    {
        return (bool) MessagingCredentialModel::where('channel', $channel)->delete();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listLogs(): array
    {
        return [];
    }

    /**
     * @param array<string, mixed> $params
     * @return array{messageId: string, status: string}
     */
    public function send(string $channel, array $params): array
    {
        return [
            'messageId' => Str::uuid()->toString(),
            'status' => 'queued',
        ];
    }

    private function toTemplateEntity(EmailTemplateModel $model): EmailTemplateEntity
    {
        return new EmailTemplateEntity(
            id: $model->id,
            name: $model->name,
            subject: $model->subject,
            body: $model->body,
            channel: $model->channel,
            variables: $model->variables,
            isActive: (bool) $model->is_active,
            createdAt: new DateTimeImmutable($model->created_at->toIso8601String()),
            updatedAt: new DateTimeImmutable($model->updated_at->toIso8601String()),
        );
    }

    private function toCredentialEntity(MessagingCredentialModel $model): MessagingCredentialEntity
    {
        return new MessagingCredentialEntity(
            channel: $model->channel,
            provider: $model->provider,
            isConfigured: (bool) $model->is_configured,
        );
    }
}
