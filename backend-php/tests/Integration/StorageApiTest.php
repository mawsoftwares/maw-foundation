<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Domain\Auth\TokenServiceInterface;
use App\Storage\Services\CleanupService;
use App\Storage\Services\ConfigurationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * End-to-end: real Postgres (schema created by the Node migrations + seed), real JWT, the real routes and
 * middleware, and the local provider's signed gateway. Runs only when STORAGE_TEST_DATABASE_URL points at such a
 * database (a disposable scratch DB — this test deletes storage rows for its tenants); skipped otherwise.
 *
 *   cd apps/sample-server && DATABASE_URL=postgres://…/scratch pnpm db:migrate && pnpm db:seed
 *   cd backend-php && STORAGE_TEST_DATABASE_URL=postgres://…/scratch APP_ENV=testing vendor/bin/phpunit tests/Integration/StorageApiTest.php
 */
final class StorageApiTest extends TestCase
{
    private const A = 'demo-tenant';
    private const B = 'tenant-b';
    private string $root = '';

    protected function setUp(): void
    {
        parent::setUp();
        $url = getenv('STORAGE_TEST_DATABASE_URL');
        if ($url === false || $url === '') {
            $this->markTestSkipped('STORAGE_TEST_DATABASE_URL not set');
        }
        $p = parse_url($url);
        config(['database.connections.pgsql' => array_merge(config('database.connections.pgsql'), [
            'host' => $p['host'] ?? '127.0.0.1',
            'port' => (string) ($p['port'] ?? 5432),
            'database' => ltrim($p['path'] ?? '', '/'),
            'username' => urldecode($p['user'] ?? ''),
            'password' => urldecode($p['pass'] ?? ''),
        ])]);
        DB::purge('pgsql');

        $this->root = sys_get_temp_dir() . '/maw-php-storage-' . bin2hex(random_bytes(4));
        config([
            'storage.local_root' => $this->root,
            'storage.public_url' => 'http://localhost',
            'storage.local_signing_secret' => 'php-it-signing-secret-123456',
            'storage.encryption_key' => str_repeat('11', 32),
            'storage.max_file_size_bytes' => 1_000_000,
        ]);

        $this->wipe();
        DB::insert(
            "INSERT INTO users (id, tenant_id, email, role, password_hash) VALUES ('u-b-owner', ?, 'b-owner@example.test', 'owner', 'x') ON CONFLICT (id) DO NOTHING",
            [self::B],
        );
    }

    protected function tearDown(): void
    {
        if ($this->root !== '') {
            $this->wipe();
            DB::delete("DELETE FROM users WHERE id = 'u-b-owner'");
            self::rmrf($this->root);
        }
        parent::tearDown();
    }

    private function wipe(): void
    {
        foreach (['maw_storage_attachments', 'maw_storage_file_versions'] as $t) {
            DB::delete("DELETE FROM {$t} WHERE " . ($t === 'maw_storage_attachments' ? 'tenant_id' : '(SELECT tenant_id FROM maw_storage_files f WHERE f.id = file_id)') . ' IN (?, ?)', [self::A, self::B]);
        }
        foreach (['maw_storage_files', 'maw_storage_folders'] as $t) {
            DB::delete("DELETE FROM {$t} WHERE tenant_id IN (?, ?)", [self::A, self::B]);
        }
        DB::delete('DELETE FROM maw_storage_provider_configs WHERE tenant_id IN (?, ?)', [self::A, self::B]);
    }

    private static function rmrf(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST) as $f) {
            $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
        }
        rmdir($dir);
    }

    /** @param array{user?: string, tenant?: string, role?: string}|null $as */
    private function api(string $method, string $path, ?array $body = null, ?array $as = ['user' => 'u-owner', 'tenant' => self::A]): TestResponse
    {
        $headers = ['Accept' => 'application/json'];
        if ($as !== null) {
            $token = $this->app->make(TokenServiceInterface::class)->sign(['userId' => $as['user'], 'tenantId' => $as['tenant'], 'role' => $as['role'] ?? 'owner', 'expiresIn' => 600]);
            $headers['Authorization'] = "Bearer {$token}";
        }

        return $this->json($method, '/api/v1/storage' . $path, $body ?? [], $headers);
    }

    private const B_USER = ['user' => 'u-b-owner', 'tenant' => self::B];

    /** @return string config id */
    private function localConfig(array $as = ['user' => 'u-owner', 'tenant' => self::A]): string
    {
        return (string) $this->api('POST', '/configurations', ['provider' => 'local', 'name' => 'Local'], $as)->assertCreated()->json('data.id');
    }

    #[Test]
    public function rejects_unauthenticated_and_unauthorised_requests_in_the_contract_envelope(): void
    {
        $this->api('GET', '/folders', null, null)->assertStatus(401)->assertJsonPath('success', false)->assertJsonPath('error.code', 'UNAUTHORIZED');

        // clerk has no storage permissions in the seed
        $res = $this->api('GET', '/folders', null, ['user' => 'u-clerk', 'tenant' => self::A, 'role' => 'clerk']);
        $res->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
        self::assertArrayNotHasKey('violations', $res->json());

        // a token with no tenant claim is refused
        $token = $this->app->make(TokenServiceInterface::class)->sign(['userId' => 'u-owner', 'expiresIn' => 60]);
        $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/storage/folders')->assertStatus(401);
    }

    #[Test]
    public function manages_configurations_without_ever_returning_secrets(): void
    {
        $providers = $this->api('GET', '/providers')->assertOk()->json('data');
        self::assertSame(['azure', 'local', 'r2', 's3'], collect($providers)->pluck('type')->sort()->values()->all());
        self::assertStringNotContainsString('normalize', json_encode($providers, JSON_THROW_ON_ERROR));

        $local = $this->api('POST', '/configurations', ['provider' => 'local', 'name' => 'Local A', 'basePath' => 'a-files'])->assertCreated();
        $local->assertJsonPath('data.isDefault', true)->assertJsonPath('data.basePath', 'a-files');

        $r2 = $this->api('POST', '/configurations', ['provider' => 'r2', 'name' => 'R2', 'bucket' => 'files', 'accountId' => 'abc123def456', 'credentials' => ['accessKeyId' => 'AK', 'secretAccessKey' => 'topsecretR2value']])->assertCreated();
        $r2->assertJsonPath('data.region', 'auto')->assertJsonPath('data.endpoint', 'https://abc123def456.r2.cloudflarestorage.com')->assertJsonPath('data.hasCredentials', true)->assertJsonPath('data.isDefault', false);

        $this->api('POST', '/configurations', ['provider' => 'azure', 'name' => 'Az', 'bucket' => 'docs'])
            ->assertStatus(400)->assertJsonPath('error.code', 'VALIDATION_FAILED')->assertJsonPath('error.details.reason', 'STORAGE_INVALID_INPUT');
        $this->api('POST', '/configurations', ['provider' => 'ftp', 'name' => 'x'])->assertStatus(400)->assertJsonPath('error.details.fields.0.field', 'provider');

        $listed = $this->api('GET', '/configurations')->assertOk();
        self::assertSame(2, count($listed->json('data')));
        foreach (['topsecretR2value', 'encrypted', 'secretAccessKey', 'accessKeyId'] as $leak) {
            self::assertStringNotContainsString($leak, $listed->getContent());
        }
        $stored = (string) DB::table('maw_storage_provider_configs')->where('name', 'R2')->value('encrypted_credentials');
        self::assertMatchesRegularExpression('/^v1:/', $stored);
        self::assertStringNotContainsString('topsecretR2value', $stored);

        $this->api('PATCH', '/configurations/' . $r2->json('data.id'), ['accountId' => 'zzz999yyy888'])->assertOk()->assertJsonPath('data.endpoint', 'https://zzz999yyy888.r2.cloudflarestorage.com');
        $this->api('DELETE', '/configurations/' . $local->json('data.id'))->assertStatus(409)->assertJsonPath('error.details.reason', 'STORAGE_CONFLICT'); // default
        $this->api('DELETE', '/configurations/' . $r2->json('data.id'))->assertNoContent();
        $this->api('POST', '/configurations/' . $local->json('data.id') . '/test')->assertOk()->assertJsonPath('data.ok', true);
    }

    #[Test]
    public function manages_nested_folders_with_paths_uniqueness_and_cycle_protection(): void
    {
        $this->localConfig();
        $root = $this->api('POST', '/folders', ['name' => 'Documents'])->assertCreated();
        $child = $this->api('POST', '/folders', ['name' => 'Invoices', 'parentId' => $root->json('data.id')])->assertCreated()->assertJsonPath('data.path', '/Documents/Invoices');

        $this->api('POST', '/folders', ['name' => 'documents'])->assertStatus(409)->assertJsonPath('error.details.reason', 'STORAGE_CONFLICT');
        $this->api('POST', '/folders', ['name' => 'a/b'])->assertStatus(400);
        $this->api('PATCH', '/folders/' . $root->json('data.id'), ['parentId' => $child->json('data.id')])->assertStatus(409);
        $this->api('PATCH', '/folders/' . $root->json('data.id'), ['name' => 'Docs'])->assertOk()->assertJsonPath('data.path', '/Docs');
        self::assertSame('/Docs/Invoices', DB::table('maw_storage_folders')->where('id', $child->json('data.id'))->value('path'));

        $list = $this->api('GET', '/folders')->assertOk();
        $list->assertJsonPath('success', true)->assertJsonPath('meta.pagination.total', 1)->assertJsonPath('data.0.name', 'Docs');
        $this->api('DELETE', '/folders/' . $root->json('data.id'))->assertStatus(409);
        $this->api('DELETE', '/folders/' . $child->json('data.id'))->assertNoContent();
        $this->api('DELETE', '/folders/' . $root->json('data.id'))->assertNoContent();
    }

    #[Test]
    public function runs_the_full_direct_upload_lifecycle_against_the_local_provider(): void
    {
        $this->localConfig();
        $folder = $this->api('POST', '/folders', ['name' => 'Inbox'])->assertCreated()->json('data.id');
        $content = '%PDF-1.4 php integration test document';

        $ticket = $this->api('POST', '/uploads', ['folderId' => $folder, 'fileName' => 'Invoice 001.pdf', 'contentType' => 'application/pdf', 'fileSize' => strlen($content)])->assertCreated();
        $ticket->assertJsonPath('data.method', 'PUT')->assertJsonPath('data.expiresIn', 900);
        $fileId = $ticket->json('data.fileId');
        $uploadPath = (string) parse_url($ticket->json('data.uploadUrl'), PHP_URL_PATH);
        self::assertStringStartsWith('/api/v1/storage/local/', $uploadPath);
        self::assertStringNotContainsString($this->root, $ticket->json('data.uploadUrl'));

        // not uploaded yet → completion refused, still pending, no download
        $this->api('POST', "/uploads/{$fileId}/complete")->assertStatus(409)->assertJsonPath('error.details.reason', 'STORAGE_UPLOAD_NOT_COMPLETED');
        $this->api('GET', "/files/{$fileId}/download-url")->assertStatus(409);

        // direct upload through the signed gateway (no bearer auth)
        $this->call('PUT', $uploadPath, [], [], [], ['CONTENT_TYPE' => 'application/pdf', 'HTTP_CONTENT_LENGTH' => (string) strlen($content)], $content)->assertOk();
        $done = $this->api('POST', "/uploads/{$fileId}/complete")->assertOk();
        $done->assertJsonPath('data.status', 'uploaded')->assertJsonPath('data.name', 'Invoice 001.pdf')->assertJsonPath('data.size', strlen($content));
        self::assertSame(['createdAt', 'folderId', 'id', 'mimeType', 'name', 'size', 'status', 'updatedAt'], collect($done->json('data'))->keys()->sort()->values()->all());
        self::assertSame("tenant/demo-tenant/folder/{$folder}/file/{$fileId}/original", DB::table('maw_storage_files')->where('id', $fileId)->value('object_key'));
        self::assertSame(1, DB::table('maw_storage_file_versions')->where('file_id', $fileId)->where('version_number', 1)->count());
        $this->api('POST', "/uploads/{$fileId}/complete")->assertOk()->assertJsonPath('data.status', 'uploaded'); // idempotent
        self::assertSame(1, DB::table('maw_storage_file_versions')->where('file_id', $fileId)->count());

        $this->api('GET', "/files/{$fileId}")->assertOk()->assertJsonPath('data.id', $fileId);
        $listing = $this->api('GET', "/folders/{$folder}/files?search=invoice")->assertOk();
        $listing->assertJsonPath('meta.pagination.total', 1)->assertJsonPath('data.0.id', $fileId);

        $dl = $this->api('GET', "/files/{$fileId}/download-url?disposition=inline")->assertOk()->assertJsonPath('data.expiresIn', 300);
        $get = $this->get((string) parse_url($dl->json('data.url'), PHP_URL_PATH))->assertOk();
        self::assertSame($content, $get->streamedContent());
        self::assertSame('application/pdf', $get->headers->get('content-type'));
        self::assertStringContainsString('inline', (string) $get->headers->get('content-disposition'));
        self::assertSame('nosniff', $get->headers->get('x-content-type-options'));

        // attach to a generic entity (idempotent), then clean up
        $a1 = $this->api('POST', '/attachments', ['fileId' => $fileId, 'entityType' => 'invoice', 'entityId' => '123', 'category' => 'supporting_document'])->assertCreated();
        $a2 = $this->api('POST', '/attachments', ['fileId' => $fileId, 'entityType' => 'invoice', 'entityId' => '123', 'category' => 'supporting_document'])->assertCreated();
        self::assertSame($a1->json('data.id'), $a2->json('data.id'));
        self::assertCount(1, $this->api('GET', '/attachments?entityType=invoice&entityId=123')->assertOk()->json('data'));

        $this->api('DELETE', "/files/{$fileId}")->assertNoContent();
        $this->api('GET', "/files/{$fileId}")->assertStatus(404)->assertJsonPath('error.details.reason', 'STORAGE_FILE_NOT_FOUND');
        self::assertSame('deleted', DB::table('maw_storage_files')->where('id', $fileId)->value('status'));
        $this->get((string) parse_url($dl->json('data.url'), PHP_URL_PATH))->assertStatus(404); // object removed
    }

    #[Test]
    public function fails_uploads_that_do_not_match_what_was_declared_and_enforces_gateway_rules(): void
    {
        $this->localConfig();
        $ticket = $this->api('POST', '/uploads', ['fileName' => 'a.txt', 'contentType' => 'text/plain', 'fileSize' => 5])->assertCreated();
        $path = (string) parse_url($ticket->json('data.uploadUrl'), PHP_URL_PATH);
        $fileId = $ticket->json('data.fileId');

        // wrong content type / wrong length are refused at the gateway
        $this->call('PUT', $path, [], [], [], ['CONTENT_TYPE' => 'text/html'], 'hello')->assertStatus(400);
        $this->call('PUT', $path, [], [], [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_CONTENT_LENGTH' => '99'], 'hello')->assertStatus(400);
        // tampered / foreign tokens
        $this->call('PUT', substr($path, 0, -2) . 'xx', [], [], [], ['CONTENT_TYPE' => 'text/plain'], 'hello')->assertStatus(403);
        $this->get('/api/v1/storage/local/not.a-token')->assertStatus(403);

        // declared size is changed in the DB, so the (valid) upload no longer matches → failed + object removed
        DB::table('maw_storage_files')->where('id', $fileId)->update(['file_size' => 99]);
        $this->call('PUT', $path, [], [], [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_CONTENT_LENGTH' => '5'], 'hello')->assertOk();
        $this->api('POST', "/uploads/{$fileId}/complete")->assertStatus(409)->assertJsonPath('error.details.reason', 'STORAGE_UPLOAD_FAILED');
        self::assertSame('failed', DB::table('maw_storage_files')->where('id', $fileId)->value('status'));
        $this->api('POST', "/uploads/{$fileId}/complete")->assertStatus(409)->assertJsonPath('error.details.reason', 'STORAGE_UPLOAD_FAILED');
        self::assertSame([], glob($this->root . '/tenant/*/folder/*/file/*/original') ?: []);

        // request-time validation
        foreach ([['fileSize' => 5_000_000], ['fileSize' => 0], ['fileSize' => '10'], ['contentType' => 'nonsense'], ['fileName' => '...'], ['folderId' => 'nope']] as $bad) {
            $this->api('POST', '/uploads', $bad + ['fileName' => 'a.pdf', 'contentType' => 'application/pdf', 'fileSize' => 10])->assertStatus(400)->assertJsonPath('error.code', 'VALIDATION_FAILED');
        }
    }

    #[Test]
    public function isolates_tenants_completely(): void
    {
        $this->localConfig();
        $this->localConfig(self::B_USER);
        $folder = $this->api('POST', '/folders', ['name' => 'Private'])->assertCreated();
        $ticket = $this->api('POST', '/uploads', ['folderId' => $folder->json('data.id'), 'fileName' => 'a.txt', 'contentType' => 'text/plain', 'fileSize' => 5])->assertCreated();
        $fileId = $ticket->json('data.fileId');
        $this->call('PUT', (string) parse_url($ticket->json('data.uploadUrl'), PHP_URL_PATH), [], [], [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_CONTENT_LENGTH' => '5'], 'hello')->assertOk();
        $this->api('POST', "/uploads/{$fileId}/complete")->assertOk();
        $attachment = $this->api('POST', '/attachments', ['fileId' => $fileId, 'entityType' => 'x', 'entityId' => '1'])->assertCreated()->json('data.id');
        $configA = (string) DB::table('maw_storage_provider_configs')->where('tenant_id', self::A)->value('id');

        foreach ([['GET', "/files/{$fileId}"], ['GET', "/files/{$fileId}/download-url"], ['POST', "/uploads/{$fileId}/complete"], ['DELETE', "/files/{$fileId}"]] as [$m, $p]) {
            $this->api($m, $p, null, self::B_USER)->assertStatus(404)->assertJsonPath('error.details.reason', 'STORAGE_FILE_NOT_FOUND');
        }
        $this->api('GET', '/folders/' . $folder->json('data.id') . '/files', null, self::B_USER)->assertStatus(404)->assertJsonPath('error.details.reason', 'STORAGE_FOLDER_NOT_FOUND');
        $this->api('POST', '/folders', ['name' => 'x', 'parentId' => $folder->json('data.id')], self::B_USER)->assertStatus(404);
        $this->api('PATCH', '/folders/' . $folder->json('data.id'), ['name' => 'pwn'], self::B_USER)->assertStatus(404);
        $this->api('POST', '/uploads', ['folderId' => $folder->json('data.id'), 'fileName' => 'x.txt', 'contentType' => 'text/plain', 'fileSize' => 1], self::B_USER)->assertStatus(404);
        $this->api('POST', '/folders', ['name' => 'x', 'storageConfigId' => $configA], self::B_USER)->assertStatus(404)->assertJsonPath('error.details.reason', 'STORAGE_CONFIGURATION_NOT_FOUND');
        $this->api('PATCH', "/configurations/{$configA}", ['name' => 'pwn'], self::B_USER)->assertStatus(404);
        $this->api('POST', "/configurations/{$configA}/test", null, self::B_USER)->assertStatus(404);
        $this->api('DELETE', "/configurations/{$configA}", null, self::B_USER)->assertStatus(404);
        $this->api('DELETE', "/attachments/{$attachment}", null, self::B_USER)->assertStatus(404);
        self::assertSame([], $this->api('GET', '/attachments?entityType=x&entityId=1', null, self::B_USER)->assertOk()->json('data'));
        $this->api('GET', "/files/{$fileId}")->assertOk(); // the owner is unaffected
    }

    #[Test]
    public function reads_credentials_encrypted_by_the_node_backend(): void
    {
        $fx = json_decode((string) file_get_contents(__DIR__ . '/../Fixtures/node-interop.json'), true, 512, JSON_THROW_ON_ERROR);
        $s3 = DB::table('maw_storage_providers')->where('code', 's3')->value('id');
        $id = (string) \Illuminate\Support\Str::uuid();
        DB::table('maw_storage_provider_configs')->insert([
            'id' => $id, 'tenant_id' => self::A, 'provider_id' => $s3, 'name' => 'Written by Node', 'bucket_name' => 'b', 'region' => 'us-east-1',
            'base_path' => '', 'encrypted_credentials' => $fx['cipher']['ciphertext'], 'is_default' => true,
        ]);

        $this->api('GET', '/configurations')->assertOk()->assertJsonPath('data.0.hasCredentials', true);
        [$config, $provider] = $this->app->make(ConfigurationService::class)->resolve(self::A, $id); // decrypts the Node ciphertext
        self::assertSame('s3', $config->providerType);
        self::assertInstanceOf(\App\Storage\Providers\S3StorageProvider::class, $provider);
        $this->api('PATCH', "/configurations/{$id}", ['name' => 'Renamed'])->assertOk();
        self::assertSame($fx['cipher']['ciphertext'], DB::table('maw_storage_provider_configs')->where('id', $id)->value('encrypted_credentials'), 'credentials untouched when not replaced');
    }

    #[Test]
    public function cleanup_fails_abandoned_uploads_and_retries_interrupted_deletions(): void
    {
        $this->localConfig();
        $stale = $this->api('POST', '/uploads', ['fileName' => 'old.txt', 'contentType' => 'text/plain', 'fileSize' => 5])->assertCreated()->json('data.fileId');
        $fresh = $this->api('POST', '/uploads', ['fileName' => 'new.txt', 'contentType' => 'text/plain', 'fileSize' => 5])->assertCreated()->json('data.fileId');
        DB::table('maw_storage_files')->where('id', $stale)->update(['created_at' => now()->subHours(48)]);

        $done = $this->api('POST', '/uploads', ['fileName' => 'x.txt', 'contentType' => 'text/plain', 'fileSize' => 5])->assertCreated();
        $this->call('PUT', (string) parse_url($done->json('data.uploadUrl'), PHP_URL_PATH), [], [], [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_CONTENT_LENGTH' => '5'], 'hello')->assertOk();
        $this->api('POST', '/uploads/' . $done->json('data.fileId') . '/complete')->assertOk();
        // simulate a delete whose provider call failed: soft-deleted but status unchanged
        DB::table('maw_storage_files')->where('id', $done->json('data.fileId'))->update(['deleted_at' => now()]);

        $report = $this->app->make(CleanupService::class)->run(24);
        self::assertSame(['abandonedUploads' => 1, 'retriedDeletions' => 1, 'errors' => 0], $report);
        self::assertSame('failed', DB::table('maw_storage_files')->where('id', $stale)->value('status'));
        self::assertSame('pending', DB::table('maw_storage_files')->where('id', $fresh)->value('status'));
        self::assertSame('deleted', DB::table('maw_storage_files')->where('id', $done->json('data.fileId'))->value('status'));
        self::assertSame(['abandonedUploads' => 0, 'retriedDeletions' => 0, 'errors' => 0], $this->app->make(CleanupService::class)->run(24));
    }
}
