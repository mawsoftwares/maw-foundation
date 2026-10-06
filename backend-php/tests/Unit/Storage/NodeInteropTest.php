<?php

declare(strict_types=1);

namespace Tests\Unit\Storage;

use App\Storage\Core\ProviderRuntimeConfig;
use App\Storage\Providers\AzureSas;
use App\Storage\Providers\S3StorageProvider;
use App\Storage\Util\CredentialCipher;
use App\Storage\Util\LocalUrlSigner;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Proves the PHP implementation is byte-compatible with the Node module by checking it against output
 * produced by the real Node/SDK code (tests/Fixtures/node-interop.json — regenerate with the script in
 * apps/sample-server/scripts/php-interop-fixtures.ts).
 */
final class NodeInteropTest extends TestCase
{
    /** @var array<string, mixed> */
    private array $fx;

    protected function setUp(): void
    {
        $this->fx = json_decode((string) file_get_contents(dirname(__DIR__, 2) . '/Fixtures/node-interop.json'), true, 512, JSON_THROW_ON_ERROR);
    }

    /** @return array<string, string> */
    private static function query(string $url): array
    {
        parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
        ksort($q);

        return array_map('strval', $q);
    }

    #[Test]
    public function decrypts_credentials_encrypted_by_node(): void
    {
        $cipher = new CredentialCipher($this->fx['cipher']['keyHex']);

        self::assertSame($this->fx['cipher']['plain'], $cipher->decryptRaw($this->fx['cipher']['ciphertext']));
        self::assertSame(['accessKeyId' => 'AKIAEXAMPLE', 'secretAccessKey' => 'sec/ret+value=='], $cipher->decrypt($this->fx['cipher']['ciphertext']));
    }

    #[Test]
    public function encrypts_in_the_shared_v1_format_and_round_trips(): void
    {
        $cipher = new CredentialCipher($this->fx['cipher']['keyHex']);
        $text = $cipher->encrypt('ACCESS', 'sec/ret');

        self::assertMatchesRegularExpression('/^v1:[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/', $text);
        self::assertSame(['accessKeyId' => 'ACCESS', 'secretAccessKey' => 'sec/ret'], $cipher->decrypt($text));
        self::assertNotSame($text, $cipher->encrypt('ACCESS', 'sec/ret'), 'a fresh IV is used every time');
        self::assertStringNotContainsString('sec/ret', $text);
    }

    #[Test]
    public function rejects_tampered_or_foreign_ciphertext_without_leaking_details(): void
    {
        $cipher = new CredentialCipher($this->fx['cipher']['keyHex']);
        $parts = explode(':', $this->fx['cipher']['ciphertext']);
        $parts[2] = strrev($parts[2]);
        foreach ([implode(':', $parts), 'garbage', 'v2:aa:bb:cc'] as $bad) {
            try {
                $cipher->decrypt($bad);
                self::fail('expected failure');
            } catch (\App\Storage\Core\StorageException $e) {
                self::assertSame('STORAGE_PROVIDER_ERROR', $e->reason);
            }
        }
        $this->expectException(\InvalidArgumentException::class);
        new CredentialCipher('short');
    }

    #[Test]
    public function verifies_local_tokens_minted_by_node_and_vice_versa(): void
    {
        $signer = new LocalUrlSigner($this->fx['localToken']['secret']);

        $put = $signer->verify($this->fx['localToken']['token']);
        self::assertSame('put', $put['op'] ?? null);
        self::assertSame(1234, $put['contentLength'] ?? null);
        self::assertSame($this->fx['key'], $put['key'] ?? null);

        $get = $signer->verify($this->fx['localToken']['getToken']);
        self::assertSame('inline', $get['disposition'] ?? null);
        self::assertSame('héllo "x".png', $get['fileName'] ?? null);

        $minted = $signer->sign(['tenantId' => 't', 'configId' => 'c', 'key' => 'a/b', 'op' => 'get', 'exp' => time() + 60, 'contentType' => 'x/y']);
        self::assertNotNull($signer->verify($minted));
    }

    #[Test]
    public function rejects_tampered_expired_and_foreign_local_tokens(): void
    {
        $signer = new LocalUrlSigner($this->fx['localToken']['secret']);
        $token = $this->fx['localToken']['token'];

        self::assertNull($signer->verify(substr($token, 0, -2) . 'xx'));
        self::assertNull($signer->verify($token, 4102444801), 'expired');
        self::assertNull((new LocalUrlSigner('another-secret-another-secret'))->verify($token));
        foreach (['', 'abc', 'a.b.c', '.'] as $bad) {
            self::assertNull($signer->verify($bad));
        }
        $this->expectException(\InvalidArgumentException::class);
        new LocalUrlSigner('short');
    }

    #[Test]
    public function azure_sas_matches_the_node_sdk_exactly(): void
    {
        $a = $this->fx['azure'];
        $common = [$a['account'], $a['keyBase64'], $a['container']];

        $upload = AzureSas::query(...$common, blobName: $a['blobName'], permissions: 'cw', startsAt: $a['startsAt'], expiresAt: $a['expiresAt'], httpsOnly: true);
        self::assertSame(self::query($a['upload']), self::query('https://x/?' . $upload), 'upload SAS (create+write)');

        $download = AzureSas::query(
            ...$common,
            blobName: $a['blobName'], permissions: 'r', startsAt: $a['startsAt'], expiresAt: $a['expiresAt'], httpsOnly: true,
            contentDisposition: S3StorageProvider::contentDisposition('attachment', 'Invoice 1.pdf'), contentType: 'application/pdf',
        );
        self::assertSame(self::query($a['download']), self::query('https://x/?' . $download), 'download SAS (read + response overrides)');

        $list = AzureSas::query(...$common, blobName: null, permissions: 'l', startsAt: $a['startsAt'], expiresAt: $a['expiresAt'], httpsOnly: true);
        self::assertSame(self::query($a['containerList']), self::query('https://x/?' . $list), 'container SAS (list)');
    }

    #[Test]
    public function s3_presigned_urls_match_the_node_sdk_exactly(): void
    {
        $s = $this->fx['s3'];
        $provider = new S3StorageProvider(
            new ProviderRuntimeConfig('c1', 't1', 's3', 'client-files', 'ap-south-1', null, 'maw/prod', 'AKIAEXAMPLEKEY12345', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'),
            static fn (): int => $s['signingTime'],
        );

        $put = $provider->createUploadUrl($this->fx['key'], 'application/pdf', 125000, 900);
        self::assertSame(parse_url($s['put'], PHP_URL_HOST), parse_url($put->url, PHP_URL_HOST));
        self::assertSame(parse_url($s['put'], PHP_URL_PATH), parse_url($put->url, PHP_URL_PATH));
        self::assertSame(self::query($s['put']), self::query($put->url), 'PUT signature incl. signed content-type + content-length');
        self::assertSame(['Content-Type' => 'application/pdf'], $put->headers);
        self::assertSame('content-length;content-type;host', self::query($put->url)['X-Amz-SignedHeaders']);

        $get = $provider->createDownloadUrl($this->fx['key'], 'Invoice 1.pdf', 'application/pdf', 'attachment', 300);
        self::assertSame(self::query($s['get']), self::query($get->url), 'GET signature incl. response overrides');
    }

    #[Test]
    public function s3_urls_never_carry_a_body_checksum_or_the_secret(): void
    {
        $provider = new S3StorageProvider(new ProviderRuntimeConfig('c', 't', 's3', 'b', 'us-east-1', null, '', 'AKIAEXAMPLEKEY12345', 'topsecretvalue1234567890'));
        $url = $provider->createUploadUrl('tenant/t/x', 'text/plain', 5, 60)->url;

        foreach (array_keys(self::query($url)) as $name) {
            self::assertStringNotContainsStringIgnoringCase('checksum', $name === 'X-Amz-Content-Sha256' ? '' : $name);
        }
        self::assertStringNotContainsString('topsecretvalue', $url);
    }
}
