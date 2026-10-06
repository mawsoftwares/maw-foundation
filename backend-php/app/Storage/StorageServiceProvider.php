<?php

declare(strict_types=1);

namespace App\Storage;

use App\Storage\Core\ProviderFactory;
use App\Storage\Core\StorageSettings;
use App\Storage\Providers\Providers;
use App\Storage\Repositories\AttachmentRepository;
use App\Storage\Repositories\ConfigRepository;
use App\Storage\Repositories\DbAttachmentRepository;
use App\Storage\Repositories\DbConfigRepository;
use App\Storage\Repositories\DbFileRepository;
use App\Storage\Repositories\DbFolderRepository;
use App\Storage\Repositories\DbVersionRepository;
use App\Storage\Repositories\FileRepository;
use App\Storage\Repositories\FolderRepository;
use App\Storage\Repositories\VersionRepository;
use App\Storage\Util\CredentialCipher;
use App\Storage\Util\LocalUrlSigner;
use Illuminate\Support\ServiceProvider;

/** Wires MAW Storage. Settings come from config/storage.php (STORAGE_* environment variables). */
final class StorageServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../../config/storage.php', 'storage');

        $this->app->singleton(StorageSettings::class, function (): StorageSettings {
            /**
             * @var array<string, mixed> $c
             */
            $c = config('storage');

            return new StorageSettings(
                localRoot: (string) $c['local_root'],
                localSigningSecret: (string) $c['local_signing_secret'],
                publicBaseUrl: (string) $c['public_url'],
                encryptionKeyHex: (string) $c['encryption_key'],
                uploadUrlTtlSeconds: (int) $c['upload_url_ttl_seconds'],
                downloadUrlTtlSeconds: (int) $c['download_url_ttl_seconds'],
                maxFileSizeBytes: (int) $c['max_file_size_bytes'],
                allowedMimeTypes: array_values(array_filter(array_map('trim', array_map('strtolower', explode(',', (string) $c['allowed_mime_types']))))),
                pendingUploadMaxAgeHours: (int) $c['pending_upload_max_age_hours'],
            );
        });

        $this->app->singleton(CredentialCipher::class, function ($app): CredentialCipher {
            $key = $app->make(StorageSettings::class)->encryptionKeyHex;
            if (app()->environment('production') && preg_match('/^0+$/', $key) === 1) {
                throw new \RuntimeException('STORAGE_ENCRYPTION_KEY (or MFA_ENCRYPTION_KEY) must not be the all-zero development key in production');
            }

            return new CredentialCipher($key);
        });
        $this->app->singleton(LocalUrlSigner::class, fn ($app): LocalUrlSigner => new LocalUrlSigner($app->make(StorageSettings::class)->localSigningSecret));
        $this->app->singleton(ProviderFactory::class, function ($app): ProviderFactory {
            $s = $app->make(StorageSettings::class);

            return Providers::defaultFactory($s->localRoot, $app->make(LocalUrlSigner::class), $s->publicBaseUrl);
        });

        $this->app->bind(ConfigRepository::class, DbConfigRepository::class);
        $this->app->bind(FolderRepository::class, DbFolderRepository::class);
        $this->app->bind(FileRepository::class, DbFileRepository::class);
        $this->app->bind(VersionRepository::class, DbVersionRepository::class);
        $this->app->bind(AttachmentRepository::class, DbAttachmentRepository::class);
    }
}
