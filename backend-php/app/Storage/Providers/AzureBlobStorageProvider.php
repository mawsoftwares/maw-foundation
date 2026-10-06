<?php

declare(strict_types=1);

namespace App\Storage\Providers;

use App\Storage\Core\DownloadUrl;
use App\Storage\Core\Errors;
use App\Storage\Core\ObjectMetadata;
use App\Storage\Core\ProviderRuntimeConfig;
use App\Storage\Core\StorageException;
use App\Storage\Core\StorageProvider;
use App\Storage\Core\UploadUrl;
use App\Storage\Util\ObjectKey;
use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use Illuminate\Support\Facades\Log;

/**
 * Azure Blob Storage via account-key SAS URLs. Credentials map onto the shared pair: `accessKeyId` = storage
 * account name, `secretAccessKey` = account key; `bucketName` = container.
 *
 * Server-side operations (HEAD/DELETE/probe) call the REST API with short-lived SAS URLs too, so no extra SDK
 * is needed. A SAS cannot pin the upload's Content-Length: size/type are enforced by the completion step.
 */
final class AzureBlobStorageProvider implements StorageProvider
{
    /** Tolerate small clock differences between this server and Azure. */
    private const CLOCK_SKEW = 300;
    private const OP_TTL = 300;

    private readonly string $account;
    private readonly string $accountKey;
    private readonly string $container;
    private readonly string $endpoint;
    private readonly string $prefix;
    private readonly bool $https;
    private readonly ClientInterface $http;

    public function __construct(ProviderRuntimeConfig $config, ?ClientInterface $http = null)
    {
        if ($config->bucketName === null || $config->bucketName === '') {
            throw Errors::invalidInput('Azure storage requires a container name');
        }
        if ($config->accessKeyId === null || $config->secretAccessKey === null) {
            throw Errors::invalidInput('Azure storage requires a storage account name and key');
        }
        $this->account = $config->accessKeyId;
        $this->accountKey = $config->secretAccessKey;
        $this->container = $config->bucketName;
        $this->endpoint = rtrim($config->endpoint ?? "https://{$this->account}.blob.core.windows.net", '/');
        $this->https = str_starts_with($this->endpoint, 'https://');
        $this->prefix = $config->basePath !== '' ? $config->basePath . '/' : '';
        $this->http = $http ?? new Client(['timeout' => 15, 'http_errors' => false]);
    }

    public function createUploadUrl(string $key, string $contentType, int $contentLength, int $expiresInSeconds): UploadUrl
    {
        $now = time();
        $url = $this->blobUrl($key, 'cw', $now, $now + $expiresInSeconds);

        return new UploadUrl(
            $url,
            ['Content-Type' => $contentType, 'x-ms-blob-type' => 'BlockBlob'],
            gmdate('Y-m-d\TH:i:s.000\Z', $now + $expiresInSeconds),
        );
    }

    public function createDownloadUrl(string $key, string $fileName, string $contentType, string $disposition, int $expiresInSeconds): DownloadUrl
    {
        $now = time();
        $url = $this->blobUrl($key, 'r', $now, $now + $expiresInSeconds, S3StorageProvider::contentDisposition($disposition, $fileName), $contentType);

        return new DownloadUrl($url, gmdate('Y-m-d\TH:i:s.000\Z', $now + $expiresInSeconds));
    }

    public function deleteObject(string $key): void
    {
        $now = time();
        $status = $this->send('DELETE', $this->blobUrl($key, 'd', $now, $now + self::OP_TTL), 'deleteObject')->getStatusCode();
        if (! in_array($status, [200, 202, 404], true)) {
            throw $this->fail('deleteObject', $status);
        }
    }

    public function objectExists(string $key): bool
    {
        $now = time();
        $status = $this->send('HEAD', $this->blobUrl($key, 'r', $now, $now + self::OP_TTL), 'objectExists')->getStatusCode();
        if ($status === 200) {
            return true;
        }
        if ($status === 404) {
            return false;
        }
        throw $this->fail('objectExists', $status);
    }

    public function getObjectMetadata(string $key): ObjectMetadata
    {
        $now = time();
        $response = $this->send('HEAD', $this->blobUrl($key, 'r', $now, $now + self::OP_TTL), 'getObjectMetadata');
        $status = $response->getStatusCode();
        if ($status === 404) {
            throw Errors::objectNotFound();
        }
        if ($status !== 200) {
            throw $this->fail('getObjectMetadata', $status);
        }
        $type = $response->getHeaderLine('Content-Type');
        $etag = $response->getHeaderLine('ETag');

        return new ObjectMetadata((int) $response->getHeaderLine('Content-Length'), $type !== '' ? $type : null, $etag !== '' ? $etag : null);
    }

    public function verifyAccess(): void
    {
        $now = time();
        $query = AzureSas::query($this->account, $this->accountKey, $this->container, null, 'l', $now - self::CLOCK_SKEW, $now + self::OP_TTL, $this->https);
        $url = "{$this->endpoint}/{$this->container}?restype=container&comp=list&maxresults=1&{$query}";
        $status = $this->send('GET', $url, 'verifyAccess')->getStatusCode();
        if ($status !== 200) {
            throw $this->fail('verifyAccess', $status);
        }
    }

    private function blobUrl(string $key, string $permissions, int $now, int $expiresAt, ?string $disposition = null, ?string $contentType = null): string
    {
        $blob = $this->prefix . ObjectKey::assertSafe($key);
        $query = AzureSas::query($this->account, $this->accountKey, $this->container, $blob, $permissions, $now - self::CLOCK_SKEW, $expiresAt, $this->https, $disposition, $contentType);

        return "{$this->endpoint}/{$this->container}/{$blob}?{$query}";
    }

    private function send(string $method, string $url, string $operation): \Psr\Http\Message\ResponseInterface
    {
        try {
            return $this->http->request($method, $url, ['headers' => ['x-ms-version' => AzureSas::VERSION], 'http_errors' => false]);
        } catch (\Throwable $e) {
            throw $this->fail($operation, null, $e::class);
        }
    }

    /** Logs only the operation and HTTP status — never URLs (they carry the SAS signature) or credentials. */
    private function fail(string $operation, ?int $status, ?string $error = null): StorageException
    {
        Log::error('Azure provider error', ['operation' => $operation, 'status' => $status, 'error' => $error]);

        return Errors::providerError();
    }
}
