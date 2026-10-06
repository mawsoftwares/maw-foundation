<?php

declare(strict_types=1);

namespace App\Storage\Core;

final readonly class DownloadUrl
{
    public function __construct(public string $url, public string $expiresAt) {}
}
