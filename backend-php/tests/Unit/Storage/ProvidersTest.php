<?php

declare(strict_types=1);

namespace Tests\Unit\Storage;

use App\Storage\Core\ProviderRuntimeConfig;
use App\Storage\Core\StorageException;
use App\Storage\Providers\AzureBlobStorageProvider;
use App\Storage\Providers\LocalStorageProvider;
use App\Storage\Providers\PayloadTooLargeException;
use App\Storage\Providers\Providers;
use App\Storage\Providers\R2StorageProvider;
use App\Storage\Providers\S3StorageProvider;
use App\Storage\Util\LocalUrlSigner;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class ProvidersTest extends TestCase
{
    private const KEY = 'tenant/t1/folder/root/file/00000000-0000-4000-8000-000000000001/original';
    private string $root = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = sys_get_temp_dir() . '/maw-php-prov-' . bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        if (is_dir($this->root)) {
            foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($this->root, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST) as $f) {
                $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
            }
            rmdir($this->root);
        }
        parent::tearDown();
    }

    private function local(): LocalStorageProvider
    {
        return new LocalStorageProvider($this->root, new LocalUrlSigner('unit-signing-secret-123456'), 'http://localhost', '/api/v1/storage/local', 't1', 'c1');
    }

    /** @param resource|string $data @return resource */
    private static function stream(string $data)
    {
        $h = fopen('php://memory', 'r+b');
        fwrite($h, $data);
        rewind($h);

        return $h;
    }

    #[Test]
    public function local_provider_stores_streams_checks_and_deletes_objects(): void
    {
        $p = $this->local();
        self::assertFalse($p->objectExists(self::KEY));
        self::assertSame(13, $p->writeStream(self::KEY, self::stream('hello storage'), 100));
        self::assertTrue($p->objectExists(self::KEY));
        self::assertSame(13, $p->getObjectMetadata(self::KEY)->size);
        [$h, $size] = $p->openReadStream(self::KEY);
        self::assertSame('hello storage', stream_get_contents($h));
        self::assertSame(13, $size);
        $p->deleteObject(self::KEY);
        $p->deleteObject(self::KEY); // idempotent
        self::assertFalse($p->objectExists(self::KEY));
        try {
            $p->getObjectMetadata(self::KEY);
            self::fail('expected not found');
        } catch (StorageException $e) {
            self::assertSame('STORAGE_OBJECT_NOT_FOUND', $e->reason);
        }
    }

    #[Test]
    public function local_provider_enforces_the_size_cap_and_leaves_no_partial_files(): void
    {
        $p = $this->local();
        try {
            $p->writeStream(self::KEY, self::stream(str_repeat('x', 50)), 10);
            self::fail('expected PayloadTooLargeException');
        } catch (PayloadTooLargeException) {
            self::assertFalse($p->objectExists(self::KEY));
            self::assertSame([], glob($this->root . '/tenant/t1/folder/root/file/*/*.part-*') ?: []);
        }
    }

    #[Test]
    public function local_provider_signed_urls_never_expose_the_filesystem_path(): void
    {
        $up = $this->local()->createUploadUrl(self::KEY, 'text/plain', 5, 60);
        self::assertStringStartsWith('http://localhost/api/v1/storage/local/', $up->url);
        self::assertStringNotContainsString($this->root, $up->url);
        self::assertSame(['Content-Type' => 'text/plain'], $up->headers);
        self::assertSame('PUT', $up->method);
    }

    #[Test]
    public function local_provider_blocks_path_traversal_everywhere(): void
    {
        $p = $this->local();
        foreach (['../../etc/passwd', '/etc/passwd', 'a/../../b', 'a//b', 'a/./b', '', 'a\\b'] as $key) {
            foreach ([
                static fn () => $p->objectExists($key),
                static fn () => $p->deleteObject($key),
                static fn () => $p->createUploadUrl($key, 'text/plain', 1, 60),
                static fn () => $p->openReadStream($key),
            ] as $call) {
                try {
                    $call();
                    self::fail("expected {$key} to be rejected");
                } catch (StorageException $e) {
                    self::assertSame('STORAGE_INVALID_INPUT', $e->reason);
                }
            }
        }
    }

    #[Test]
    public function registry_builds_every_provider_from_configuration_alone(): void
    {
        $factory = Providers::defaultFactory($this->root, new LocalUrlSigner('unit-signing-secret-123456'), 'http://x');
        $cfg = static fn (string $type, array $o = []): ProviderRuntimeConfig => new ProviderRuntimeConfig(
            'c', 't', $type, $o['bucket'] ?? 'b', $o['region'] ?? 'us-east-1', $o['endpoint'] ?? null, '', $o['key'] ?? null, $o['secret'] ?? null,
        );
        self::assertSame(['azure', 'local', 'r2', 's3'], collect($factory->supportedTypes())->sort()->values()->all());
        self::assertInstanceOf(LocalStorageProvider::class, $factory->get($cfg('local')));
        self::assertInstanceOf(S3StorageProvider::class, $factory->get($cfg('s3')));
        self::assertInstanceOf(R2StorageProvider::class, $factory->get($cfg('r2', ['endpoint' => 'https://acct123456.r2.cloudflarestorage.com'])));
        self::assertInstanceOf(AzureBlobStorageProvider::class, $factory->get($cfg('azure', ['key' => 'acct', 'secret' => base64_encode(str_repeat('k', 32))])));
        $this->expectException(StorageException::class);
        $factory->get($cfg('gcs'));
    }

    #[Test]
    public function provider_descriptors_normalise_settings(): void
    {
        self::assertSame(['bucket' => 'b', 'region' => 'auto', 'endpoint' => 'https://abc123def456.r2.cloudflarestorage.com'], Providers::r2()->normalize(['bucket' => 'b', 'accountId' => 'abc123def456']));
        self::assertSame('https://x.eu.r2.cloudflarestorage.com', Providers::r2()->normalize(['bucket' => 'b', 'accountId' => 'abc123def456', 'endpoint' => 'https://x.eu.r2.cloudflarestorage.com'])['endpoint']);
        self::assertSame(['bucket' => 'c', 'region' => null, 'endpoint' => null], Providers::azure()->normalize(['bucket' => 'c']));
        self::assertSame(['bucket' => null, 'region' => null, 'endpoint' => null], Providers::local()->normalize(['bucket' => 'ignored']));
        foreach ([fn () => Providers::s3()->normalize(['bucket' => 'b']), fn () => Providers::r2()->normalize(['bucket' => 'b']), fn () => Providers::azure()->normalize([])] as $bad) {
            try {
                $bad();
                self::fail('expected invalid input');
            } catch (StorageException $e) {
                self::assertSame('STORAGE_INVALID_INPUT', $e->reason);
            }
        }
        self::assertArrayNotHasKey('normalize', Providers::s3()->toArray());
    }

    /** @param list<Response|\Throwable> $responses @param list<array<string, mixed>> $history */
    private function azure(array $responses, array &$history = []): AzureBlobStorageProvider
    {
        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($history));

        return new AzureBlobStorageProvider(
            new ProviderRuntimeConfig('c', 't', 'azure', 'files', null, null, 'maw', 'acct', base64_encode(str_repeat('k', 32))),
            new Client(['handler' => $stack, 'http_errors' => false]),
        );
    }

    #[Test]
    public function azure_server_side_calls_use_short_lived_sas_urls_and_map_statuses(): void
    {
        $history = [];
        $p = $this->azure([
            new Response(200, ['Content-Length' => '42', 'Content-Type' => 'text/plain', 'ETag' => '"0x1"']),
            new Response(404),
            new Response(404),
            new Response(202),
            new Response(404),
            new Response(200),
        ], $history);

        $meta = $p->getObjectMetadata(self::KEY);
        self::assertSame([42, 'text/plain', '"0x1"'], [$meta->size, $meta->contentType, $meta->etag]);
        try {
            $p->getObjectMetadata(self::KEY);
            self::fail('expected not found');
        } catch (StorageException $e) {
            self::assertSame('STORAGE_OBJECT_NOT_FOUND', $e->reason);
        }
        self::assertFalse($p->objectExists(self::KEY));
        $p->deleteObject(self::KEY);
        $p->deleteObject(self::KEY); // 404 is fine: idempotent
        $p->verifyAccess();

        $methods = array_map(static fn (array $h): string => $h['request']->getMethod(), $history);
        self::assertSame(['HEAD', 'HEAD', 'HEAD', 'DELETE', 'DELETE', 'GET'], $methods);
        $first = (string) $history[0]['request']->getUri();
        self::assertStringStartsWith('https://acct.blob.core.windows.net/files/maw/' . self::KEY . '?', $first);
        parse_str((string) parse_url($first, PHP_URL_QUERY), $q);
        self::assertSame('r', $q['sp']);
        self::assertSame('b', $q['sr']);
        $delete = (string) $history[3]['request']->getUri();
        self::assertStringContainsString('sp=d', $delete);
        self::assertStringContainsString('restype=container', (string) $history[5]['request']->getUri());
        self::assertSame('2022-11-02', $history[0]['request']->getHeaderLine('x-ms-version'));
    }

    #[Test]
    public function azure_failures_become_a_generic_provider_error_without_leaking_urls(): void
    {
        foreach ([new Response(403), new Response(500), new \GuzzleHttp\Exception\ConnectException('boom https://acct.blob.core.windows.net/?sig=SECRET', new \GuzzleHttp\Psr7\Request('HEAD', 'http://x'))] as $failure) {
            $p = $this->azure([$failure]);
            try {
                $p->getObjectMetadata(self::KEY);
                self::fail('expected provider error');
            } catch (StorageException $e) {
                self::assertSame('STORAGE_PROVIDER_ERROR', $e->reason);
                self::assertStringNotContainsString('SECRET', $e->getMessage());
                self::assertSame(503, $e->httpStatus);
            }
        }
    }

    #[Test]
    public function azure_upload_requires_the_blob_type_header_and_https_only_sas(): void
    {
        $up = $this->azure([])->createUploadUrl(self::KEY, 'image/png', 10, 900);
        self::assertSame(['Content-Type' => 'image/png', 'x-ms-blob-type' => 'BlockBlob'], $up->headers);
        parse_str((string) parse_url($up->url, PHP_URL_QUERY), $q);
        self::assertSame(['cw', 'https'], [$q['sp'], $q['spr']]);

        $azurite = new AzureBlobStorageProvider(
            new ProviderRuntimeConfig('c', 't', 'azure', 'files', null, 'http://127.0.0.1:10000/acct', '', 'acct', base64_encode(str_repeat('k', 32))),
        );
        $url = $azurite->createDownloadUrl(self::KEY, 'a.txt', 'text/plain', 'inline', 60)->url;
        self::assertStringStartsWith('http://127.0.0.1:10000/acct/files/', $url);
        self::assertStringNotContainsString('spr=', $url);

        $this->expectException(StorageException::class);
        new AzureBlobStorageProvider(new ProviderRuntimeConfig('c', 't', 'azure', 'files', null, null, '', null, null));
    }
}
