<?php

declare(strict_types=1);

namespace App\Storage\Util;

use App\Storage\Core\Errors;

/** Object-key rules identical to Node's `object-key.util.ts`. */
final class ObjectKey
{
    private const SAFE_SEGMENT = '/^[A-Za-z0-9_-]{1,64}$/';
    private const KEY_PATTERN = '/^[A-Za-z0-9_\-\/]+$/';
    private const BASE_PATH_PATTERN = '/^[A-Za-z0-9_\-.\/]+$/';

    /** `tenant/{tenantId}/folder/{folderId|root}/file/{fileId}/original` — ids only, never the file name. */
    public static function build(string $tenantId, ?string $folderId, string $fileId): string
    {
        $folder = $folderId === null ? 'root' : self::segment($folderId, 'folder id');

        return 'tenant/' . self::segment($tenantId, 'tenant id') . "/folder/{$folder}/file/" . self::segment($fileId, 'file id') . '/original';
    }

    /** Defence in depth for providers: reject anything that could escape a root. */
    public static function assertSafe(string $key): string
    {
        $bad = $key === '' || strlen($key) > 1024 || str_starts_with($key, '/') || preg_match(self::KEY_PATTERN, $key) !== 1;
        if (! $bad) {
            foreach (explode('/', $key) as $segment) {
                if ($segment === '' || $segment === '.' || $segment === '..') {
                    $bad = true;
                    break;
                }
            }
        }
        if ($bad) {
            throw Errors::invalidInput('Invalid object key');
        }

        return $key;
    }

    /** Normalises an admin-supplied base path (`a/b`) and rejects traversal. */
    public static function normalizeBasePath(?string $basePath): string
    {
        $trimmed = trim(trim((string) $basePath), '/');
        if ($trimmed === '') {
            return '';
        }
        $bad = strlen($trimmed) > 255 || preg_match(self::BASE_PATH_PATTERN, $trimmed) !== 1;
        if (! $bad) {
            foreach (explode('/', $trimmed) as $segment) {
                if ($segment === '' || $segment === '.' || $segment === '..') {
                    $bad = true;
                    break;
                }
            }
        }
        if ($bad) {
            throw Errors::invalidInput('Invalid base path');
        }

        return $trimmed;
    }

    public static function extensionOf(string $fileName): string
    {
        $dot = strrpos($fileName, '.');
        if ($dot === false || $dot <= 0 || $dot === strlen($fileName) - 1) {
            return '';
        }

        return substr(preg_replace('/[^a-z0-9]/', '', strtolower(substr($fileName, $dot + 1))) ?? '', 0, 32);
    }

    private static function segment(string $value, string $label): string
    {
        if (preg_match(self::SAFE_SEGMENT, $value) !== 1) {
            throw Errors::invalidInput("Unsafe {$label} for object key");
        }

        return $value;
    }
}
