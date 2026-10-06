<?php

declare(strict_types=1);

namespace App\Storage\Core;

use Closure;

/**
 * Self-description of a provider: which settings it needs, how they map onto the stored columns, and how
 * its credential pair is labelled. Drives API validation and `GET /storage/providers`.
 */
final class ProviderDescriptor
{
    /**
     * @param list<array<string, mixed>> $fields   name,label,required[,placeholder,help,prefillFromEndpoint]
     * @param array<string, mixed>|null  $credentials required,accessKeyLabel,secretLabel[,help] — null ⇒ none
     * @param Closure(array<string, mixed>): array{bucket: ?string, region: ?string, endpoint: ?string} $normalize
     */
    public function __construct(
        public readonly string $type,
        public readonly string $label,
        public readonly string $description,
        public readonly array $fields,
        public readonly ?array $credentials,
        private readonly Closure $normalize,
    ) {}

    /**
     * @param array<string, mixed> $input
     * @return array{bucket: ?string, region: ?string, endpoint: ?string}
     */
    public function normalize(array $input): array
    {
        return ($this->normalize)($input);
    }

    /**
     * @return list<string>
     */
    public function fieldNames(): array
    {
        return array_map(static fn (array $f): string => (string) $f['name'], $this->fields);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'type' => $this->type,
            'label' => $this->label,
            'description' => $this->description,
            'fields' => $this->fields,
            'credentials' => $this->credentials,
        ];
    }
}
