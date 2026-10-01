<?php

declare(strict_types=1);

namespace App\Domain\Messaging;

use DateTimeImmutable;

final readonly class EmailTemplateEntity
{
    /**
     * @param string[]|null $variables
     */
    public function __construct(
        public string $id,
        public string $name,
        public string $subject,
        public string $body,
        public ?string $channel,
        public ?array $variables,
        public bool $isActive,
        public DateTimeImmutable $createdAt,
        public DateTimeImmutable $updatedAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'subject' => $this->subject,
            'body' => $this->body,
            'channel' => $this->channel,
            'variables' => $this->variables,
            'isActive' => $this->isActive,
            'createdAt' => $this->createdAt->format(DateTimeImmutable::ATOM),
            'updatedAt' => $this->updatedAt->format(DateTimeImmutable::ATOM),
        ];
    }
}
