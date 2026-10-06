<?php

declare(strict_types=1);

namespace App\Storage\Core;

final readonly class ObjectMetadata
{
    public function __construct(public int $size, public ?string $contentType, public ?string $etag) {}
}
