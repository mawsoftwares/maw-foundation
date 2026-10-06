<?php

declare(strict_types=1);

namespace App\Storage\Services;

use App\Storage\Core\Errors;
use App\Storage\Core\ProviderDescriptor;
use App\Storage\Core\ProviderFactory;
use App\Storage\Core\ProviderRuntimeConfig;
use App\Storage\Core\StorageConfig;
use App\Storage\Core\StorageProvider;
use App\Storage\Repositories\ConfigRepository;
use App\Storage\Util\CredentialCipher;
use App\Storage\Util\ObjectKey;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class ConfigurationService
{
    public function __construct(
        private readonly ConfigRepository $configs,
        private readonly CredentialCipher $cipher,
        private readonly ProviderFactory $factory,
    ) {}

    /**
     * Providers this server can use, with the settings each one needs (drives the admin form).
     *
     * @return list<array<string, mixed>>
     */
    public function listProviders(): array
    {
        return array_map(static fn (ProviderDescriptor $d): array => $d->toArray(), $this->factory->descriptors());
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(string $tenantId): array
    {
        return array_map(static fn (StorageConfig $c): array => $c->toView(), $this->configs->list($tenantId));
    }

    /**
     * @param array<string, mixed> $input provider,name,bucket?,region?,endpoint?,accountId?,basePath?,credentials?,isDefault?
     * @return array<string, mixed>
     */
    public function create(string $tenantId, array $input): array
    {
        $type = (string) $input['provider'];
        $descriptor = $this->factory->descriptor($type);
        $provider = $this->configs->findProviderByType($type) ?? throw Errors::providerNotFound($type);
        $credentials = is_array($input['credentials'] ?? null) ? $input['credentials'] : null;
        $this->assertAllowedFields($descriptor, $input);
        $this->assertCredentials($descriptor, $credentials, true);
        $settings = $descriptor->normalize($input);

        $created = $this->configs->create([
            'id' => (string) Str::uuid(),
            'tenantId' => $tenantId,
            'providerId' => $provider['id'],
            'name' => (string) $input['name'],
            'bucketName' => $settings['bucket'],
            'region' => $settings['region'],
            'endpoint' => $settings['endpoint'],
            'basePath' => ObjectKey::normalizeBasePath($input['basePath'] ?? null),
            'encryptedCredentials' => $credentials !== null ? $this->cipher->encrypt($credentials['accessKeyId'], $credentials['secretAccessKey']) : null,
        ]);

        if (($input['isDefault'] ?? false) === true || $this->configs->findDefault($tenantId) === null) {
            $this->configs->setDefault($tenantId, $created->id);
        }
        Log::info('Storage configuration created', ['tenantId' => $tenantId, 'configId' => $created->id, 'provider' => $type]);

        return $this->requireConfig($tenantId, $created->id)->toView();
    }

    /**
     * @param array<string, mixed> $input only the keys the client sent (null is an explicit "clear")
     * @return array<string, mixed>
     */
    public function update(string $tenantId, string $id, array $input): array
    {
        $existing = $this->requireConfig($tenantId, $id);
        $descriptor = $this->factory->descriptor($existing->providerType);
        $credentials = is_array($input['credentials'] ?? null) ? $input['credentials'] : null;
        $this->assertAllowedFields($descriptor, $input);
        $this->assertCredentials($descriptor, $credentials, false);
        if (($input['isActive'] ?? null) === false && $existing->isDefault) {
            throw Errors::conflict('Choose another default configuration before deactivating this one');
        }

        $settings = null;
        if (array_intersect(['bucket', 'region', 'endpoint', 'accountId'], array_keys($input)) !== []) {
            $settings = $descriptor->normalize([
                'bucket' => array_key_exists('bucket', $input) ? $input['bucket'] : $existing->bucketName,
                'region' => array_key_exists('region', $input) ? $input['region'] : $existing->region,
                // A newly entered account id must win over the endpoint derived from the previous one.
                'endpoint' => array_key_exists('endpoint', $input) ? $input['endpoint'] : (! empty($input['accountId']) ? null : $existing->endpoint),
                'accountId' => $input['accountId'] ?? null,
            ]);
        }

        $patch = [];
        if (array_key_exists('name', $input)) {
            $patch['name'] = $input['name'];
        }
        if ($settings !== null) {
            $patch += ['bucketName' => $settings['bucket'], 'region' => $settings['region'], 'endpoint' => $settings['endpoint']];
        }
        if (array_key_exists('basePath', $input)) {
            $patch['basePath'] = ObjectKey::normalizeBasePath($input['basePath']);
        }
        if ($credentials !== null) {
            $patch['encryptedCredentials'] = $this->cipher->encrypt($credentials['accessKeyId'], $credentials['secretAccessKey']);
        }
        if (array_key_exists('isActive', $input)) {
            $patch['isActive'] = $input['isActive'];
        }
        $this->configs->update($tenantId, $id, $patch);
        if (($input['isDefault'] ?? null) === true) {
            $this->configs->setDefault($tenantId, $id);
        }
        Log::info('Storage configuration updated', ['tenantId' => $tenantId, 'configId' => $id]);

        return $this->requireConfig($tenantId, $id)->toView();
    }

    public function delete(string $tenantId, string $id): void
    {
        $existing = $this->requireConfig($tenantId, $id);
        if ($existing->isDefault) {
            throw Errors::conflict('The default configuration cannot be deleted');
        }
        if ($this->configs->countReferences($tenantId, $id) > 0) {
            throw Errors::conflict('This configuration is used by folders or files; deactivate it instead');
        }
        $this->configs->delete($tenantId, $id);
        Log::info('Storage configuration deleted', ['tenantId' => $tenantId, 'configId' => $id]);
    }

    /**
     * Connectivity probe. Never surfaces provider details to the caller.
     *
     * @return array{ok: bool, message: string}
     */
    public function test(string $tenantId, string $id): array
    {
        [, $provider] = $this->resolve($tenantId, $id, true);
        try {
            $provider->verifyAccess();

            return ['ok' => true, 'message' => 'Storage is reachable'];
        } catch (\Throwable) {
            return ['ok' => false, 'message' => 'Storage could not be reached with this configuration'];
        }
    }

    /**
     * Returns [config, provider] for a tenant configuration (or the tenant default when `$configId` is null).
     * Every lookup is tenant-scoped, so another tenant's configuration id behaves as "not found".
     *
     * @return array{0: StorageConfig, 1: StorageProvider}
     */
    public function resolve(string $tenantId, ?string $configId, bool $allowInactive = false): array
    {
        $config = $configId === null ? $this->configs->findDefault($tenantId) : $this->configs->findById($tenantId, $configId);
        if ($config === null || (! $config->isActive && ! $allowInactive)) {
            throw Errors::configurationNotFound();
        }

        return [$config, $this->factory->get($this->toRuntime($config))];
    }

    public function requireActive(string $tenantId, string $id): StorageConfig
    {
        $config = $this->configs->findById($tenantId, $id);
        if ($config === null || ! $config->isActive) {
            throw Errors::configurationNotFound();
        }

        return $config;
    }

    public function requireDefault(string $tenantId): StorageConfig
    {
        return $this->configs->findDefault($tenantId) ?? throw Errors::configurationNotFound();
    }

    private function requireConfig(string $tenantId, string $id): StorageConfig
    {
        return $this->configs->findById($tenantId, $id) ?? throw Errors::configurationNotFound();
    }

    /**
     * Rejects settings the provider does not use (e.g. a bucket for local disk).
     *
     * @param array<string, mixed> $input
     */
    private function assertAllowedFields(ProviderDescriptor $descriptor, array $input): void
    {
        $allowed = $descriptor->fieldNames();
        foreach (['bucket', 'region', 'endpoint', 'accountId'] as $name) {
            $value = $input[$name] ?? null;
            // `region` is derived by some providers (R2 → "auto"), so it is tolerated, never required, there.
            if (is_string($value) && trim($value) !== '' && ! in_array($name, $allowed, true) && $name !== 'region') {
                throw Errors::invalidInput("{$descriptor->label} does not use \"{$name}\"");
            }
        }
    }

    /**
     * @param array<string, mixed>|null $credentials
     */
    private function assertCredentials(ProviderDescriptor $descriptor, ?array $credentials, bool $creating): void
    {
        if ($descriptor->credentials === null && $credentials !== null) {
            throw Errors::invalidInput("{$descriptor->label} does not use credentials");
        }
        if ($creating && ($descriptor->credentials['required'] ?? false) && $credentials === null) {
            throw Errors::invalidInput("{$descriptor->credentials['accessKeyLabel']} and {$descriptor->credentials['secretLabel']} are required");
        }
    }

    private function toRuntime(StorageConfig $c): ProviderRuntimeConfig
    {
        $creds = $c->encryptedCredentials !== null ? $this->cipher->decrypt($c->encryptedCredentials) : null;

        return new ProviderRuntimeConfig(
            $c->id, $c->tenantId, $c->providerType, $c->bucketName, $c->region, $c->endpoint, $c->basePath,
            $creds['accessKeyId'] ?? null, $creds['secretAccessKey'] ?? null,
        );
    }
}
