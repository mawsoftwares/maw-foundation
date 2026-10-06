<?php

declare(strict_types=1);

namespace App\Storage\Providers;

use App\Storage\Core\DownloadUrl;
use App\Storage\Core\Errors;
use App\Storage\Core\ObjectMetadata;
use App\Storage\Core\StorageProvider;
use App\Storage\Core\UploadUrl;
use App\Storage\Util\LocalUrlSigner;
use App\Storage\Util\ObjectKey;
use Illuminate\Support\Facades\Log;

/** Local disk. Direct transfer goes through the signed gateway (see Http/Controllers/LocalGatewayController). */
final class LocalStorageProvider implements StorageProvider
{
    private readonly string $root;

    public function __construct(
        string $rootDir,
        private readonly LocalUrlSigner $signer,
        private readonly string $publicBaseUrl,
        private readonly string $gatewayPath,
        private readonly string $tenantId,
        private readonly string $configId,
    ) {
        $this->root = rtrim($rootDir, '/');
    }

    public function createUploadUrl(string $key, string $contentType, int $contentLength, int $expiresInSeconds): UploadUrl
    {
        $exp = time() + $expiresInSeconds;
        $token = $this->signer->sign([
            'tenantId' => $this->tenantId,
            'configId' => $this->configId,
            'key' => ObjectKey::assertSafe($key),
            'op' => 'put',
            'exp' => $exp,
            'contentType' => $contentType,
            'contentLength' => $contentLength,
        ]);

        return new UploadUrl($this->gatewayUrl($token), ['Content-Type' => $contentType], gmdate('Y-m-d\TH:i:s.000\Z', $exp));
    }

    public function createDownloadUrl(string $key, string $fileName, string $contentType, string $disposition, int $expiresInSeconds): DownloadUrl
    {
        $exp = time() + $expiresInSeconds;
        $token = $this->signer->sign([
            'tenantId' => $this->tenantId,
            'configId' => $this->configId,
            'key' => ObjectKey::assertSafe($key),
            'op' => 'get',
            'exp' => $exp,
            'contentType' => $contentType,
            'fileName' => $fileName,
            'disposition' => $disposition,
        ]);

        return new DownloadUrl($this->gatewayUrl($token), gmdate('Y-m-d\TH:i:s.000\Z', $exp));
    }

    public function deleteObject(string $key): void
    {
        $path = $this->resolve($key);
        if (is_file($path) && ! @unlink($path)) {
            throw $this->fail('delete');
        }
    }

    public function objectExists(string $key): bool
    {
        return is_file($this->resolve($key));
    }

    public function getObjectMetadata(string $key): ObjectMetadata
    {
        $path = $this->resolve($key);
        if (! is_file($path)) {
            throw Errors::objectNotFound();
        }
        $size = filesize($path);
        if ($size === false) {
            throw $this->fail('metadata');
        }

        // Local disk does not record a content type; the gateway enforces it at upload time.
        return new ObjectMetadata($size, null, null);
    }

    public function verifyAccess(): void
    {
        if (! is_dir($this->root) && ! @mkdir($this->root, 0775, true) && ! is_dir($this->root)) {
            throw $this->fail('verify');
        }
        if (! is_readable($this->root) || ! is_writable($this->root)) {
            throw $this->fail('verify');
        }
    }

    // --- Used only by the local gateway --------------------------------------------------------------

    /**
     * @param resource $source
     * @throws PayloadTooLargeException when more than `$maxBytes` arrive
     */
    public function writeStream(string $key, $source, int $maxBytes): int
    {
        $target = $this->resolve($key);
        $dir = dirname($target);
        if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw $this->fail('write');
        }
        $temp = $target . '.part-' . bin2hex(random_bytes(6));
        $out = @fopen($temp, 'xb');
        if ($out === false) {
            throw $this->fail('write');
        }
        $written = 0;
        try {
            while (! feof($source)) {
                $chunk = fread($source, 65536);
                if ($chunk === false) {
                    throw $this->fail('write');
                }
                $written += strlen($chunk);
                if ($written > $maxBytes) {
                    throw new PayloadTooLargeException();
                }
                if ($chunk !== '' && fwrite($out, $chunk) === false) {
                    throw $this->fail('write');
                }
            }
            fclose($out);
            $out = null;
            if (! rename($temp, $target)) {
                throw $this->fail('write');
            }

            return $written;
        } catch (\Throwable $e) {
            if (is_resource($out)) {
                fclose($out);
            }
            @unlink($temp);
            throw $e;
        }
    }

    /**
     * @return array{0: resource, 1: int}
     */
    public function openReadStream(string $key): array
    {
        $path = $this->resolve($key);
        if (! is_file($path)) {
            throw Errors::objectNotFound();
        }
        $handle = @fopen($path, 'rb');
        $size = filesize($path);
        if ($handle === false || $size === false) {
            throw $this->fail('read');
        }

        return [$handle, $size];
    }

    /** Resolves a provider-relative key inside the root; anything escaping the root is rejected. */
    private function resolve(string $key): string
    {
        // assertSafe already forbids `..`, absolute paths and empty segments; the prefix check is a second wall.
        $path = $this->root . '/' . ObjectKey::assertSafe($key);
        if (! str_starts_with($path, $this->root . '/')) {
            throw Errors::invalidInput('Invalid object key');
        }

        return $path;
    }

    private function gatewayUrl(string $token): string
    {
        return rtrim($this->publicBaseUrl, '/') . $this->gatewayPath . '/' . $token;
    }

    private function fail(string $operation): \Throwable
    {
        Log::error('Local storage provider error', ['operation' => $operation]);

        return Errors::providerError();
    }
}
