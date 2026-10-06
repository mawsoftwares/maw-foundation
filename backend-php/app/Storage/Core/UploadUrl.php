<?php

declare(strict_types=1);

namespace App\Storage\Core;

final readonly class UploadUrl
{
    /**
     * @param array<string, string> $headers Headers the client MUST send with the upload request.
     */
    public function __construct(
        public string $url,
        public array $headers,
        public string $expiresAt,
        public string $method = 'PUT',
    ) {}
}
