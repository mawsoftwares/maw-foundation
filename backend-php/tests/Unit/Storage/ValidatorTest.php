<?php

declare(strict_types=1);

namespace Tests\Unit\Storage;

use App\Storage\Core\StorageException;
use App\Storage\Core\StorageSettings;
use App\Storage\Http\Validator;
use App\Storage\Util\ObjectKey;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class ValidatorTest extends TestCase
{
    private function settings(array $allowed = ['image/*', 'application/pdf']): StorageSettings
    {
        return new StorageSettings('/tmp', 'secret-secret-secret', 'http://x', str_repeat('0', 64), maxFileSizeBytes: 1000, allowedMimeTypes: $allowed);
    }

    private const OK = ['fileName' => 'a.pdf', 'contentType' => 'application/pdf', 'fileSize' => 10];

    #[Test]
    public function accepts_and_normalises_a_valid_upload_request(): void
    {
        $r = Validator::createUpload(['contentType' => 'Application/PDF'] + self::OK, $this->settings());
        self::assertSame('application/pdf', $r['contentType']);
        self::assertNull($r['folderId']);
        self::assertSame(10, $r['fileSize']);
    }

    /** @return iterable<string, array{0: array<string, mixed>}> */
    public static function badUploads(): iterable
    {
        yield 'oversized' => [['fileSize' => 1001] + self::OK];
        yield 'zero size' => [['fileSize' => 0] + self::OK];
        yield 'fractional size' => [['fileSize' => 1.5] + self::OK];
        yield 'string size' => [['fileSize' => '10'] + self::OK];
        yield 'malformed mime' => [['contentType' => 'nonsense'] + self::OK];
        yield 'disallowed mime' => [['contentType' => 'application/x-msdownload'] + self::OK];
        yield 'missing name' => [['fileName' => ' '] + self::OK];
        yield 'dots-only name' => [['fileName' => '...'] + self::OK];
        yield 'bad folder id' => [['folderId' => 'not-a-uuid'] + self::OK];
    }

    /** @param array<string, mixed> $body */
    #[Test]
    #[DataProvider('badUploads')]
    public function rejects_invalid_upload_requests(array $body): void
    {
        try {
            Validator::createUpload($body, $this->settings());
            self::fail('expected a validation error');
        } catch (StorageException $e) {
            self::assertSame('VALIDATION_FAILED', $e->errorCode);
            self::assertSame(400, $e->httpStatus);
            self::assertNotEmpty($e->details['fields']);
        }
    }

    #[Test]
    public function sanitises_path_characters_in_file_names(): void
    {
        $name = Validator::createUpload(['fileName' => '../../etc/passwd'] + self::OK, $this->settings())['fileName'];
        self::assertStringNotContainsString('/', $name);
    }

    #[Test]
    public function validates_folder_names_and_updates(): void
    {
        self::assertSame(['name' => 'Docs', 'parentId' => null], Validator::createFolder(['name' => ' Docs ']));
        foreach ([['name' => 'a/b'], ['name' => '..'], ['name' => ''], [], ['name' => 'x', 'parentId' => 'nope']] as $bad) {
            try {
                Validator::createFolder($bad);
                self::fail('expected failure for ' . json_encode($bad));
            } catch (StorageException) {
                $this->addToAssertionCount(1);
            }
        }
        self::assertSame(['parentId' => null], Validator::updateFolder(['parentId' => null]));
        $this->expectException(StorageException::class);
        Validator::updateFolder([]);
    }

    #[Test]
    public function configuration_input_keeps_only_what_was_sent_on_update(): void
    {
        self::assertSame(['name' => 'N', 'isActive' => false], Validator::updateConfiguration(['name' => 'N', 'isActive' => false]));
        self::assertSame(['bucket' => null], Validator::updateConfiguration(['bucket' => '']));
        $create = Validator::createConfiguration(['provider' => 'r2', 'name' => 'R', 'accountId' => 'abc123def456', 'bucket' => 'b', 'credentials' => ['accessKeyId' => 'a', 'secretAccessKey' => 's']]);
        self::assertSame('r2', $create['provider']);
        self::assertSame(['accessKeyId' => 'a', 'secretAccessKey' => 's'], $create['credentials']);
        foreach ([['provider' => 'ftp', 'name' => 'x'], ['provider' => 's3'], ['provider' => 's3', 'name' => 'x', 'endpoint' => 'ftp://nope'], ['provider' => 's3', 'name' => 'x', 'credentials' => ['accessKeyId' => 'a']], ['provider' => 's3', 'name' => 'x', 'isDefault' => 'yes']] as $bad) {
            try {
                Validator::createConfiguration($bad);
                self::fail('expected failure for ' . json_encode($bad));
            } catch (StorageException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    #[Test]
    public function parses_paging_search_and_references(): void
    {
        self::assertSame(['page' => 1, 'pageSize' => 20], Validator::listQuery([]));
        self::assertSame(['page' => 3, 'pageSize' => 100, 'search' => 'inv', 'sortBy' => 'size', 'sortDir' => 'desc'], Validator::listQuery(['page' => '3', 'pageSize' => '9999', 'search' => 'inv', 'sortBy' => 'size', 'sortDir' => 'DESC']));
        self::assertSame(['page' => 1, 'pageSize' => 20], Validator::listQuery(['page' => '-4', 'pageSize' => 'abc']));
        self::assertNull(Validator::parentRef(null, 'p'));
        self::assertNull(Validator::parentRef('root', 'p'));
        self::assertSame('inline', Validator::disposition('inline'));
        self::assertSame('attachment', Validator::disposition(null));
        $this->expectException(StorageException::class);
        Validator::disposition('weird');
    }

    #[Test]
    public function object_keys_are_built_from_ids_only_and_traversal_is_rejected(): void
    {
        self::assertSame('tenant/demo-tenant/folder/root/file/abc/original', ObjectKey::build('demo-tenant', null, 'abc'));
        self::assertSame('tenant/t/folder/f1/file/x/original', ObjectKey::build('t', 'f1', 'x'));
        foreach (['../x', 'a/b', 'a b', '', str_repeat('x', 65)] as $bad) {
            foreach ([[$bad, null], ['t', $bad]] as [$tenant, $folder]) {
                try {
                    ObjectKey::build($tenant, $folder, 'f');
                    self::fail('expected failure');
                } catch (StorageException) {
                    $this->addToAssertionCount(1);
                }
            }
        }
        self::assertSame('a/b-c_d/e', ObjectKey::assertSafe('a/b-c_d/e'));
        foreach (['../../etc/passwd', '/etc/passwd', 'a/../../b', 'a//b', 'a/./b', '', 'a\\b', 'tenant/t1/%2e%2e/x'] as $key) {
            try {
                ObjectKey::assertSafe($key);
                self::fail("expected {$key} to be rejected");
            } catch (StorageException $e) {
                self::assertSame('STORAGE_INVALID_INPUT', $e->reason);
            }
        }
        self::assertSame('maw', ObjectKey::normalizeBasePath('/maw/'));
        self::assertSame('', ObjectKey::normalizeBasePath(null));
        self::assertSame('pdf', ObjectKey::extensionOf('Report.FINAL.PDF'));
        self::assertSame('', ObjectKey::extensionOf('noext'));
        self::assertSame('', ObjectKey::extensionOf('.hidden'));
        $this->expectException(StorageException::class);
        ObjectKey::normalizeBasePath('a/../b');
    }
}
