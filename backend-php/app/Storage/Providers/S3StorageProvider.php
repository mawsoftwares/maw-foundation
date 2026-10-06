<?php

declare(strict_types=1);

namespace App\Storage\Providers;

use App\Storage\Core\DownloadUrl;
use App\Storage\Core\Errors;
use App\Storage\Core\ObjectMetadata;
use App\Storage\Core\ProviderRuntimeConfig;
use App\Storage\Core\StorageProvider;
use App\Storage\Core\UploadUrl;
use App\Storage\Util\ObjectKey;
use Aws\Credentials\Credentials;
use Aws\Exception\AwsException;
use Aws\S3\S3Client;
use Illuminate\Support\Facades\Log;

/** AWS S3 and S3-compatible stores (MinIO, R2 via endpoint, ...). */
class S3StorageProvider implements StorageProvider
{
    private readonly S3Client $client;
    private readonly S3SignatureV4Strict $signer;
    private readonly string $bucket;
    private readonly string $prefix;
    /**
     * @var \Closure(): int
     */
    private readonly \Closure $clock;

    /**
     * @param (\Closure(): int)|null $clock injectable for deterministic signatures in tests
     */
    public function __construct(ProviderRuntimeConfig $config, ?\Closure $clock = null)
    {
        $this->clock = $clock ?? static fn (): int => time();
        if ($config->bucketName === null || $config->bucketName === '' || $config->region === null || $config->region === '') {
            throw Errors::invalidInput('S3 storage requires a bucket and a region');
        }
        $this->bucket = $config->bucketName;
        $this->prefix = $config->basePath !== '' ? $config->basePath . '/' : '';

        $options = [
            'version' => 'latest',
            'region' => $config->region,
            // The SDK would otherwise add a body checksum to presigned PUT URLs that real uploads then fail.
            'request_checksum_calculation' => 'when_required',
            'response_checksum_validation' => 'when_required',
        ];
        if ($config->endpoint !== null && $config->endpoint !== '') {
            $options['endpoint'] = $config->endpoint;
            $options['use_path_style_endpoint'] = true;
        }
        if ($config->accessKeyId !== null && $config->secretAccessKey !== null) {
            $options['credentials'] = new Credentials($config->accessKeyId, $config->secretAccessKey);
        }
        $this->client = new S3Client($options);
        $this->signer = new S3SignatureV4Strict('s3', $config->region);
    }

    public function createUploadUrl(string $key, string $contentType, int $contentLength, int $expiresInSeconds): UploadUrl
    {
        try {
            $command = $this->client->getCommand('PutObject', [
                'Bucket' => $this->bucket,
                'Key' => $this->fullKey($key),
                'ContentType' => $contentType,
                'ContentLength' => $contentLength,
            ]);
            $now = ($this->clock)();
            $url = $this->presign($command, 'PutObject', $now, $expiresInSeconds);

            return new UploadUrl($url, ['Content-Type' => $contentType], gmdate('Y-m-d\TH:i:s.000\Z', $now + $expiresInSeconds));
        } catch (\Throwable $e) {
            throw $this->fail('createUploadUrl', $e);
        }
    }

    public function createDownloadUrl(string $key, string $fileName, string $contentType, string $disposition, int $expiresInSeconds): DownloadUrl
    {
        try {
            $command = $this->client->getCommand('GetObject', [
                'Bucket' => $this->bucket,
                'Key' => $this->fullKey($key),
                'ResponseContentType' => $contentType,
                'ResponseContentDisposition' => self::contentDisposition($disposition, $fileName),
            ]);
            $now = ($this->clock)();
            $url = $this->presign($command, 'GetObject', $now, $expiresInSeconds);

            return new DownloadUrl($url, gmdate('Y-m-d\TH:i:s.000\Z', $now + $expiresInSeconds));
        } catch (\Throwable $e) {
            throw $this->fail('createDownloadUrl', $e);
        }
    }

    public function deleteObject(string $key): void
    {
        try {
            $this->client->deleteObject(['Bucket' => $this->bucket, 'Key' => $this->fullKey($key)]);
        } catch (\Throwable $e) {
            throw $this->fail('deleteObject', $e);
        }
    }

    public function objectExists(string $key): bool
    {
        try {
            $this->client->headObject(['Bucket' => $this->bucket, 'Key' => $this->fullKey($key)]);

            return true;
        } catch (\Throwable $e) {
            if (self::isNotFound($e)) {
                return false;
            }
            throw $this->fail('objectExists', $e);
        }
    }

    public function getObjectMetadata(string $key): ObjectMetadata
    {
        try {
            $head = $this->client->headObject(['Bucket' => $this->bucket, 'Key' => $this->fullKey($key)]);

            return new ObjectMetadata((int) ($head['ContentLength'] ?? 0), $head['ContentType'] ?? null, $head['ETag'] ?? null);
        } catch (\Throwable $e) {
            if (self::isNotFound($e)) {
                throw Errors::objectNotFound();
            }
            throw $this->fail('getObjectMetadata', $e);
        }
    }

    public function verifyAccess(): void
    {
        try {
            $this->client->headBucket(['Bucket' => $this->bucket]);
        } catch (\Throwable $e) {
            throw $this->fail('verifyAccess', $e);
        }
    }

    /**
     * Presigns with our strict signer. Mirrors the JS SDK's request shape (`x-id` query parameter, unsigned
     * payload) so a URL issued here is indistinguishable from one issued by the Node backend.
     */
    private function presign(\Aws\CommandInterface $command, string $operation, int $now, int $expiresInSeconds): string
    {
        $request = \Aws\serialize($command)->withHeader('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD');
        $uri = $request->getUri();
        $request = $request->withUri($uri->withQuery(ltrim($uri->getQuery() . '&x-id=' . $operation, '&')));

        return (string) $this->signer->presign($request, $this->client->getCredentials()->wait(), "+{$expiresInSeconds} seconds", ['start_time' => $now])->getUri();
    }

    private function fullKey(string $key): string
    {
        return $this->prefix . ObjectKey::assertSafe($key);
    }

    private static function isNotFound(\Throwable $e): bool
    {
        return $e instanceof AwsException
            && ($e->getStatusCode() === 404 || in_array($e->getAwsErrorCode(), ['NotFound', 'NoSuchKey'], true));
    }

    public static function contentDisposition(string $kind, string $fileName): string
    {
        $ascii = preg_replace('/[^\x20-\x7e]/', '_', $fileName) ?? '';
        $ascii = str_replace(['"', '\\'], '_', $ascii);

        return $kind . '; filename="' . $ascii . '"; filename*=UTF-8\'\'' . rawurlencode($fileName);
    }

    /** Logs only the error class and AWS error code — never messages, hosts, URLs or credentials. */
    private function fail(string $operation, \Throwable $e): \Throwable
    {
        if ($e instanceof \App\Storage\Core\StorageException) {
            return $e;
        }
        Log::error('S3 provider error', [
            'operation' => $operation,
            'error' => $e instanceof AwsException ? ($e->getAwsErrorCode() ?? 'AwsException') : $e::class,
        ]);

        return Errors::providerError();
    }
}
