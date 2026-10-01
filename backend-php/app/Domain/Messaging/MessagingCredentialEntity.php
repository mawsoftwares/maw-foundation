<?php

declare(strict_types=1);

namespace App\Domain\Messaging;

final readonly class MessagingCredentialEntity
{
    public function __construct(
        public string $channel,
        public ?string $provider,
        public bool $isConfigured,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'channel' => $this->channel,
            'provider' => $this->provider,
            'isConfigured' => $this->isConfigured,
        ];
    }
}
