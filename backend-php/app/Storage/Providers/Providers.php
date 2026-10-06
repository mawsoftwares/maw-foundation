<?php

declare(strict_types=1);

namespace App\Storage\Providers;

use App\Storage\Core\Errors;
use App\Storage\Core\ProviderDescriptor;
use App\Storage\Core\ProviderFactory;
use App\Storage\Util\LocalUrlSigner;

/**
 * The single place that knows which providers exist and what each one needs.
 * Mirrors `providers/descriptors.ts` + `providers/index.ts` in the Node module.
 */
final class Providers
{
    public const LOCAL_GATEWAY_PATH = '/api/v1/storage/local';

    private static function clean(mixed $v): ?string
    {
        return is_string($v) && trim($v) !== '' ? trim($v) : null;
    }

    private static function need(?string $value, string $label): string
    {
        return $value ?? throw Errors::invalidInput("{$label} is required");
    }

    public static function local(): ProviderDescriptor
    {
        return new ProviderDescriptor(
            'local',
            'Local disk (server)',
            'Files are stored on the MAW server disk. Best for development and self-hosted installs.',
            [['name' => 'basePath', 'label' => 'Sub-folder under the storage root', 'required' => false, 'placeholder' => 'tenant-files']],
            null,
            static fn (array $in): array => ['bucket' => null, 'region' => null, 'endpoint' => null],
        );
    }

    public static function s3(): ProviderDescriptor
    {
        return new ProviderDescriptor(
            's3',
            'Amazon S3 / S3-compatible',
            'AWS S3, or any S3-compatible store (MinIO, DigitalOcean Spaces, Backblaze B2, Wasabi) via a custom endpoint.',
            [
                ['name' => 'bucket', 'label' => 'Bucket', 'required' => true, 'placeholder' => 'client-files'],
                ['name' => 'region', 'label' => 'Region', 'required' => true, 'placeholder' => 'ap-south-1'],
                ['name' => 'endpoint', 'label' => 'Endpoint (only for S3-compatible stores)', 'required' => false, 'placeholder' => 'https://…'],
                ['name' => 'basePath', 'label' => 'Base path (folder prefix inside the bucket)', 'required' => false, 'placeholder' => 'maw/prod'],
            ],
            [
                'required' => false,
                'accessKeyLabel' => 'Access key ID',
                'secretLabel' => 'Secret access key',
                'help' => 'Leave blank to use the server’s own AWS credentials (instance role, environment).',
            ],
            static fn (array $in): array => [
                'bucket' => self::need(self::clean($in['bucket'] ?? null), 'Bucket'),
                'region' => self::need(self::clean($in['region'] ?? null), 'Region'),
                'endpoint' => self::clean($in['endpoint'] ?? null),
            ],
        );
    }

    public static function r2(): ProviderDescriptor
    {
        return new ProviderDescriptor(
            'r2',
            'Cloudflare R2',
            'Cloudflare R2 object storage (S3 API, no egress fees).',
            [
                [
                    'name' => 'accountId',
                    'label' => 'Cloudflare account ID',
                    'required' => true,
                    'placeholder' => '32-character account id',
                    'help' => 'Cloudflare dashboard → R2 → account ID.',
                    'prefillFromEndpoint' => '^https://([^./]+)(?:\\.[a-z]+)?\\.r2\\.cloudflarestorage\\.com',
                ],
                ['name' => 'bucket', 'label' => 'Bucket', 'required' => true, 'placeholder' => 'client-files'],
                ['name' => 'endpoint', 'label' => 'Custom endpoint (EU / FedRAMP jurisdictions only)', 'required' => false, 'placeholder' => 'https://<account>.eu.r2.cloudflarestorage.com'],
                ['name' => 'basePath', 'label' => 'Base path (folder prefix inside the bucket)', 'required' => false, 'placeholder' => 'maw/prod'],
            ],
            [
                'required' => true,
                'accessKeyLabel' => 'R2 access key ID',
                'secretLabel' => 'R2 secret access key',
                'help' => 'Create an R2 API token with Object Read & Write on this bucket.',
            ],
            static function (array $in): array {
                $accountId = self::clean($in['accountId'] ?? null);
                $endpoint = self::clean($in['endpoint'] ?? null) ?? ($accountId !== null ? "https://{$accountId}.r2.cloudflarestorage.com" : null);
                if ($accountId !== null && preg_match('/^[A-Za-z0-9-]{8,64}$/', $accountId) !== 1) {
                    throw Errors::invalidInput('Cloudflare account ID is not valid');
                }

                return [
                    'bucket' => self::need(self::clean($in['bucket'] ?? null), 'Bucket'),
                    'region' => 'auto',
                    'endpoint' => self::need($endpoint, 'Cloudflare account ID'),
                ];
            },
        );
    }

    public static function azure(): ProviderDescriptor
    {
        return new ProviderDescriptor(
            'azure',
            'Azure Blob Storage',
            'Microsoft Azure Blob Storage with SAS (shared access signature) URLs.',
            [
                ['name' => 'bucket', 'label' => 'Container name', 'required' => true, 'placeholder' => 'client-files'],
                ['name' => 'endpoint', 'label' => 'Blob endpoint (optional — Azurite / sovereign clouds)', 'required' => false, 'placeholder' => 'https://<account>.blob.core.windows.net'],
                ['name' => 'basePath', 'label' => 'Base path (folder prefix inside the container)', 'required' => false, 'placeholder' => 'maw/prod'],
            ],
            [
                'required' => true,
                'accessKeyLabel' => 'Storage account name',
                'secretLabel' => 'Account key',
                'help' => 'Azure portal → Storage account → Security + networking → Access keys.',
            ],
            static fn (array $in): array => [
                'bucket' => self::need(self::clean($in['bucket'] ?? null), 'Container name'),
                'region' => null,
                'endpoint' => self::clean($in['endpoint'] ?? null),
            ],
        );
    }

    /** Register new providers here — one `register()` call each. */
    public static function defaultFactory(string $localRoot, LocalUrlSigner $signer, string $publicBaseUrl): ProviderFactory
    {
        return (new ProviderFactory())
            ->register('local', static fn ($c) => new LocalStorageProvider(
                $localRoot . ($c->basePath !== '' ? '/' . $c->basePath : ''),
                $signer,
                $publicBaseUrl,
                self::LOCAL_GATEWAY_PATH,
                $c->tenantId,
                $c->configId,
            ), self::local())
            ->register('s3', static fn ($c) => new S3StorageProvider($c), self::s3())
            ->register('r2', static fn ($c) => new R2StorageProvider($c), self::r2())
            ->register('azure', static fn ($c) => new AzureBlobStorageProvider($c), self::azure());
    }
}
