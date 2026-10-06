<?php

declare(strict_types=1);

namespace App\Storage\Http;

use App\Storage\Core\Errors;
use App\Storage\Core\StorageSettings;

/**
 * Request validation identical to the Node module's `storage.validators.ts`. Failures raise a 400
 * VALIDATION_FAILED with `details.fields`. Which provider settings are *required* is each provider's own
 * business (its descriptor) and is enforced by the configuration service.
 */
final class Validator
{
    private const UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
    private const MIME = '/^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/';
    private const ENTITY_TOKEN = '/^[A-Za-z0-9_.:-]{1,128}$/';
    public const PROVIDERS = ['local', 's3', 'r2', 'azure'];
    public const MAX_PAGE_SIZE = 100;
    public const DEFAULT_PAGE_SIZE = 20;

    /**
     * @var list<array{field: string, error: string}>
     */
    private array $errors = [];

    private function add(string $field, string $error): void
    {
        $this->errors[] = ['field' => $field, 'error' => $error];
    }

    private function done(): void
    {
        if ($this->errors !== []) {
            throw Errors::validation($this->errors);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private static function object(mixed $body): array
    {
        if (! is_array($body) || ($body !== [] && array_is_list($body))) {
            throw Errors::validation([['field' => 'body', 'error' => 'Request body must be a JSON object']]);
        }

        return $body;
    }

    /**
     * Returns a trimmed string, or null when absent/null/invalid (an error is recorded).
     *
     * @param array<string, mixed> $raw
     */
    private function str(array $raw, string $field, bool $required, int $max): ?string
    {
        $value = $raw[$field] ?? null;
        if ($value === null) {
            if ($required) {
                $this->add($field, 'is required');
            }

            return null;
        }
        if (! is_string($value)) {
            $this->add($field, 'must be a string');

            return null;
        }
        $trimmed = trim($value);
        if ($required && $trimmed === '') {
            $this->add($field, 'is required');
        }
        if (mb_strlen($trimmed) > $max) {
            $this->add($field, "must be at most {$max} characters");
        }

        return $trimmed;
    }

    public static function uuid(mixed $value, string $field): string
    {
        if (! is_string($value) || preg_match(self::UUID, $value) !== 1) {
            throw Errors::validation([['field' => $field, 'error' => 'must be a valid UUID']]);
        }

        return strtolower($value);
    }

    /**
     * @param array<string, mixed> $raw
     * @return array{present: bool, value: ?string}
     */
    private function optionalUuid(array $raw, string $field): array
    {
        if (! array_key_exists($field, $raw)) {
            return ['present' => false, 'value' => null];
        }
        $v = $raw[$field];
        if ($v === null) {
            return ['present' => true, 'value' => null];
        }
        if (! is_string($v) || preg_match(self::UUID, $v) !== 1) {
            $this->add($field, 'must be a valid UUID or null');

            return ['present' => false, 'value' => null];
        }

        return ['present' => true, 'value' => strtolower($v)];
    }

    /** @param list<string> $allowed */
    private static function mimeAllowed(string $contentType, array $allowed): bool
    {
        if ($allowed === []) {
            return true;
        }
        foreach ($allowed as $rule) {
            if (str_ends_with($rule, '/*') ? str_starts_with($contentType, substr($rule, 0, -1)) : $contentType === $rule) {
                return true;
            }
        }

        return false;
    }

    /** Mirrors the SDK's `sanitizeFilename`. */
    private static function sanitizeFilename(string $name): string
    {
        $clean = preg_replace('/[<>:"\/\\\\|?*\x00-\x1f]/', '_', $name) ?? '';
        $clean = preg_replace('/^\.+/', '_', $clean) ?? '';

        return mb_substr($clean, 0, 255);
    }

    /**
     * @return array{folderId: ?string, fileName: string, contentType: string, fileSize: int}
     */
    public static function createUpload(mixed $body, StorageSettings $settings): array
    {
        $v = new self();
        $raw = self::object($body);
        $folder = $v->optionalUuid($raw, 'folderId');
        $rawName = $v->str($raw, 'fileName', true, 255);
        $contentType = $v->str($raw, 'contentType', true, 255);
        $contentType = $contentType !== null ? strtolower($contentType) : null;
        $size = $raw['fileSize'] ?? null;

        $fileName = '';
        if ($rawName !== null && $rawName !== '') {
            $fileName = self::sanitizeFilename($rawName);
            if (strlen(preg_replace('/[._\s]/', '', $fileName) ?? '') === 0) {
                $v->add('fileName', 'is not a valid file name');
            }
        }
        if ($contentType !== null && $contentType !== '') {
            if (preg_match(self::MIME, $contentType) !== 1) {
                $v->add('contentType', 'must be a valid MIME type');
            } elseif (! self::mimeAllowed($contentType, $settings->allowedMimeTypes)) {
                $v->add('contentType', 'file type is not allowed');
            }
        }
        if (! is_int($size) || $size < 1) {
            $v->add('fileSize', 'must be a positive integer (bytes)');
        } elseif ($size > $settings->maxFileSizeBytes) {
            $v->add('fileSize', "must not exceed {$settings->maxFileSizeBytes} bytes");
        }
        $v->done();

        return ['folderId' => $folder['value'], 'fileName' => $fileName, 'contentType' => (string) $contentType, 'fileSize' => (int) $size];
    }

    /**
     * @param array<string, mixed> $raw
     */
    private function folderName(array $raw, bool $required): ?string
    {
        $name = $this->str($raw, 'name', $required, 255);
        if ($name !== null && $name !== '') {
            if (preg_match('/[\/\\\\\x00-\x1f]/', $name) === 1) {
                $this->add('name', 'must not contain slashes or control characters');
            } elseif ($name === '.' || $name === '..') {
                $this->add('name', 'is not a valid folder name');
            }
        }

        return $name;
    }

    /**
     * @return array{name: string, parentId: ?string, storageConfigId?: string}
     */
    public static function createFolder(mixed $body): array
    {
        $v = new self();
        $raw = self::object($body);
        $name = $v->folderName($raw, true);
        $parent = $v->optionalUuid($raw, 'parentId');
        $config = $v->optionalUuid($raw, 'storageConfigId');
        $v->done();

        return ['name' => (string) $name, 'parentId' => $parent['value']] + ($config['value'] !== null ? ['storageConfigId' => $config['value']] : []);
    }

    /**
     * @return array{name?: string, parentId?: ?string}
     */
    public static function updateFolder(mixed $body): array
    {
        $v = new self();
        $raw = self::object($body);
        $name = $v->folderName($raw, false);
        $parent = $v->optionalUuid($raw, 'parentId');
        if ($name === null && ! $parent['present']) {
            $v->add('body', 'provide name and/or parentId');
        }
        $v->done();

        return ($name !== null ? ['name' => $name] : []) + ($parent['present'] ? ['parentId' => $parent['value']] : []);
    }

    /**
     * @param array<string, mixed> $raw
     * @return array{accessKeyId: string, secretAccessKey: string}|null
     */
    private function credentials(array $raw): ?array
    {
        $value = $raw['credentials'] ?? null;
        if ($value === null) {
            return null;
        }
        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            $this->add('credentials', 'must be an object');

            return null;
        }
        $key = $this->str($value, 'accessKeyId', true, 256);
        $secret = $this->str($value, 'secretAccessKey', true, 512);

        return $key !== null && $key !== '' && $secret !== null && $secret !== '' ? ['accessKeyId' => $key, 'secretAccessKey' => $secret] : null;
    }

    /**
     * @param array<string, mixed> $raw
     * @return array{present: bool, value: ?string}
     */
    private function nullableStr(array $raw, string $field, int $max): array
    {
        if (! array_key_exists($field, $raw)) {
            return ['present' => false, 'value' => null];
        }
        if ($raw[$field] === null) {
            return ['present' => true, 'value' => null];
        }
        $v = $this->str($raw, $field, false, $max);

        return ['present' => true, 'value' => $v === '' ? null : $v];
    }

    /**
     * @param array<string, mixed> $raw
     * @return array{present: bool, value: ?string}
     */
    private function endpoint(array $raw): array
    {
        $r = $this->nullableStr($raw, 'endpoint', 512);
        if ($r['value'] !== null) {
            $scheme = strtolower((string) parse_url($r['value'], PHP_URL_SCHEME));
            if (filter_var($r['value'], FILTER_VALIDATE_URL) === false || ! in_array($scheme, ['http', 'https'], true)) {
                $this->add('endpoint', 'must be an http(s) URL');
            }
        }

        return $r;
    }

    /**
     * @return array<string, mixed>
     */
    public static function createConfiguration(mixed $body): array
    {
        $v = new self();
        $raw = self::object($body);
        $provider = $raw['provider'] ?? null;
        if (! is_string($provider) || ! in_array($provider, self::PROVIDERS, true)) {
            $v->add('provider', 'must be one of: ' . implode(', ', self::PROVIDERS));
        }
        $name = $v->str($raw, 'name', true, 128);
        $bucket = $v->nullableStr($raw, 'bucket', 255);
        $region = $v->nullableStr($raw, 'region', 64);
        $basePath = $v->nullableStr($raw, 'basePath', 255);
        $accountId = $v->nullableStr($raw, 'accountId', 64);
        $endpoint = $v->endpoint($raw);
        $creds = $v->credentials($raw);
        $isDefault = $raw['isDefault'] ?? null;
        if ($isDefault !== null && ! is_bool($isDefault)) {
            $v->add('isDefault', 'must be a boolean');
        }
        $v->done();

        return [
            'provider' => $provider,
            'name' => $name,
            'bucket' => $bucket['value'],
            'region' => $region['value'],
            'endpoint' => $endpoint['value'],
            'accountId' => $accountId['value'],
            'basePath' => $basePath['value'],
            'credentials' => $creds,
            'isDefault' => $isDefault === true,
        ];
    }

    /**
     * Only the keys the client sent.
     *
     * @return array<string, mixed>
     */
    public static function updateConfiguration(mixed $body): array
    {
        $v = new self();
        $raw = self::object($body);
        $out = [];
        $name = $v->str($raw, 'name', false, 128);
        if (array_key_exists('name', $raw) && ($name === null || $name === '')) {
            $v->add('name', 'must not be empty');
        } elseif ($name !== null) {
            $out['name'] = $name;
        }
        foreach ([['bucket', 255], ['region', 64], ['basePath', 255], ['accountId', 64]] as [$f, $max]) {
            $r = $v->nullableStr($raw, $f, $max);
            if ($r['present']) {
                $out[$f] = $r['value'];
            }
        }
        $endpoint = $v->endpoint($raw);
        if ($endpoint['present']) {
            $out['endpoint'] = $endpoint['value'];
        }
        $creds = $v->credentials($raw);
        if ($creds !== null) {
            $out['credentials'] = $creds;
        }
        foreach (['isDefault', 'isActive'] as $flag) {
            if (array_key_exists($flag, $raw)) {
                if (! is_bool($raw[$flag])) {
                    $v->add($flag, 'must be a boolean');
                } else {
                    $out[$flag] = $raw[$flag];
                }
            }
        }
        $v->done();

        return $out;
    }

    /**
     * @return array{fileId: string, entityType: string, entityId: string, category: string}
     */
    public static function createAttachment(mixed $body): array
    {
        $v = new self();
        $raw = self::object($body);
        $fileId = '';
        if (is_string($raw['fileId'] ?? null) && preg_match(self::UUID, $raw['fileId']) === 1) {
            $fileId = strtolower($raw['fileId']);
        } else {
            $v->add('fileId', 'must be a valid UUID');
        }
        $entityType = $v->str($raw, 'entityType', true, 64);
        $entityId = $v->str($raw, 'entityId', true, 128);
        $category = $v->str($raw, 'category', false, 64);
        $category = $category === null || $category === '' ? 'general' : $category;
        foreach ([['entityType', $entityType], ['entityId', $entityId], ['category', $category]] as [$field, $value]) {
            if ($value !== null && $value !== '' && preg_match(self::ENTITY_TOKEN, $value) !== 1) {
                $v->add($field, 'may only contain letters, digits and _ . : -');
            }
        }
        $v->done();

        return ['fileId' => $fileId, 'entityType' => (string) $entityType, 'entityId' => (string) $entityId, 'category' => $category];
    }

    /**
     * @param array<string, mixed> $query
     * @return array{entityType: string, entityId: string, category: ?string}
     */
    public static function entityQuery(array $query): array
    {
        $v = new self();
        $read = function (string $field, bool $required) use ($v, $query): ?string {
            $value = self::first($query[$field] ?? null);
            if ($value === null && $required) {
                $v->add($field, 'is required');
            } elseif ($value !== null && preg_match(self::ENTITY_TOKEN, $value) !== 1) {
                $v->add($field, 'may only contain letters, digits and _ . : -');
            }

            return $value;
        };
        $type = $read('entityType', true);
        $id = $read('entityId', true);
        $category = $read('category', false);
        $v->done();

        return ['entityType' => (string) $type, 'entityId' => (string) $id, 'category' => $category];
    }

    private static function first(mixed $value): ?string
    {
        $v = is_array($value) ? ($value[0] ?? null) : $value;

        return is_scalar($v) && (string) $v !== '' ? (string) $v : null;
    }

    /**
     * @param array<string, mixed> $query
     * @return array{page: int, pageSize: int, search?: string, sortBy?: string, sortDir?: string}
     */
    public static function listQuery(array $query): array
    {
        $page = filter_var(self::first($query['page'] ?? null) ?? '1', FILTER_VALIDATE_INT);
        $size = filter_var(self::first($query['pageSize'] ?? null) ?? (string) self::DEFAULT_PAGE_SIZE, FILTER_VALIDATE_INT);
        $search = self::first($query['search'] ?? null);
        $sortBy = self::first($query['sortBy'] ?? null);
        $dir = strtolower((string) self::first($query['sortDir'] ?? null));

        return [
            'page' => is_int($page) && $page > 0 ? $page : 1,
            'pageSize' => is_int($size) && $size > 0 ? min($size, self::MAX_PAGE_SIZE) : self::DEFAULT_PAGE_SIZE,
        ] + ($search !== null ? ['search' => mb_substr($search, 0, 100)] : [])
          + ($sortBy !== null ? ['sortBy' => $sortBy] : [])
          + (in_array($dir, ['asc', 'desc'], true) ? ['sortDir' => $dir] : []);
    }

    /** `root` (or absent) ⇒ null; otherwise a UUID. */
    public static function parentRef(mixed $value, string $field): ?string
    {
        $v = self::first($value);

        return $v === null || $v === 'root' ? null : self::uuid($v, $field);
    }

    /**
     * @return 'attachment'|'inline'
     */
    public static function disposition(mixed $value): string
    {
        $v = self::first($value);
        if ($v === null) {
            return 'attachment';
        }
        if ($v === 'attachment' || $v === 'inline') {
            return $v;
        }
        throw Errors::validation([['field' => 'disposition', 'error' => 'must be "attachment" or "inline"']]);
    }
}
