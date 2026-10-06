<?php

declare(strict_types=1);

namespace App\Storage\Providers;

use App\Storage\Core\Errors;
use App\Storage\Core\ProviderRuntimeConfig;

/**
 * Cloudflare R2 speaks the S3 API, so signing/HEAD/DELETE reuse the S3 provider. This class only pins what
 * R2 requires: an explicit account endpoint and the pseudo-region `auto`.
 */
final class R2StorageProvider extends S3StorageProvider
{
    public function __construct(ProviderRuntimeConfig $config)
    {
        if ($config->endpoint === null || $config->endpoint === '') {
            throw Errors::invalidInput('R2 storage requires an account endpoint');
        }
        parent::__construct(new ProviderRuntimeConfig(
            $config->configId, $config->tenantId, $config->providerType, $config->bucketName, 'auto',
            $config->endpoint, $config->basePath, $config->accessKeyId, $config->secretAccessKey,
        ));
    }
}
