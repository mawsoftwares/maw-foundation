<?php

declare(strict_types=1);

namespace App\Storage\Core;

use Closure;

/**
 * Registry of provider constructors. Adding a provider = one `register()` call (see Providers/Providers.php).
 */
final class ProviderFactory
{
    /**
     * @var array<string, Closure(ProviderRuntimeConfig): StorageProvider>
     */
    private array $creators = [];

    /**
     * @var array<string, ProviderDescriptor>
     */
    private array $descriptors = [];

    /**
     * @param Closure(ProviderRuntimeConfig): StorageProvider $creator
     */
    public function register(string $type, Closure $creator, ProviderDescriptor $descriptor): self
    {
        $this->creators[$type] = $creator;
        $this->descriptors[$type] = $descriptor;

        return $this;
    }

    public function isSupported(string $type): bool
    {
        return isset($this->creators[$type]);
    }

    /**
     * @return list<string>
     */
    public function supportedTypes(): array
    {
        return array_keys($this->creators);
    }

    public function descriptor(string $type): ProviderDescriptor
    {
        return $this->descriptors[$type] ?? throw Errors::providerNotFound($type);
    }

    /**
     * @return list<ProviderDescriptor>
     */
    public function descriptors(): array
    {
        return array_values($this->descriptors);
    }

    public function get(ProviderRuntimeConfig $config): StorageProvider
    {
        $creator = $this->creators[$config->providerType] ?? throw Errors::providerNotFound($config->providerType);

        return $creator($config);
    }
}
