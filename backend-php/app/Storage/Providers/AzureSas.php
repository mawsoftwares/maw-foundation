<?php

declare(strict_types=1);

namespace App\Storage\Providers;

/**
 * Azure Blob **service SAS** (account-key signed), string-to-sign version >= 2020-12-06.
 * Verified against `@azure/storage-blob` output for identical inputs (see tests/Unit/Storage/AzureSasTest).
 *
 * @see https://learn.microsoft.com/rest/api/storageservices/create-service-sas
 */
final class AzureSas
{
    public const VERSION = '2022-11-02';

    /**
     * Returns the SAS query string (no leading `?`).
     *
     * @param string      $permissions canonical order, e.g. `cw`, `r`, `rd`, `l` (container)
     * @param string|null $blobName    null ⇒ container-level SAS (`sr=c`)
     */
    public static function query(
        string $account,
        string $accountKeyBase64,
        string $container,
        ?string $blobName,
        string $permissions,
        int $startsAt,
        int $expiresAt,
        bool $httpsOnly,
        ?string $contentDisposition = null,
        ?string $contentType = null,
        string $version = self::VERSION,
    ): string {
        $key = base64_decode($accountKeyBase64, true);
        if ($key === false) {
            throw new \InvalidArgumentException('Azure account key must be base64');
        }
        $resource = $blobName === null ? 'c' : 'b';
        $canonical = "/blob/{$account}/{$container}" . ($blobName === null ? '' : "/{$blobName}");
        $protocol = $httpsOnly ? 'https' : '';
        $st = gmdate('Y-m-d\TH:i:s\Z', $startsAt);
        $se = gmdate('Y-m-d\TH:i:s\Z', $expiresAt);

        $stringToSign = implode("\n", [
            $permissions,
            $st,
            $se,
            $canonical,
            '',                         // signed identifier
            '',                         // signed IP range
            $protocol,
            $version,
            $resource,
            '',                         // snapshot time
            '',                         // encryption scope
            '',                         // rscc  cache-control
            $contentDisposition ?? '',  // rscd
            '',                         // rsce  content-encoding
            '',                         // rscl  content-language
            $contentType ?? '',         // rsct
        ]);
        $signature = base64_encode(hash_hmac('sha256', $stringToSign, $key, true));

        $params = ['sv' => $version];
        if ($httpsOnly) {
            $params['spr'] = 'https';
        }
        $params += ['st' => $st, 'se' => $se, 'sr' => $resource, 'sp' => $permissions];
        if ($contentDisposition !== null) {
            $params['rscd'] = $contentDisposition;
        }
        if ($contentType !== null) {
            $params['rsct'] = $contentType;
        }
        $params['sig'] = $signature;

        return implode('&', array_map(static fn (string $k, string $v): string => $k . '=' . rawurlencode($v), array_keys($params), $params));
    }
}
