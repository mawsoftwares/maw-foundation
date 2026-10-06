<?php

declare(strict_types=1);

namespace App\Storage\Core;

/** Reasons and constructors identical to the Node module's `storageErrors`. */
final class Errors
{
    public const PROVIDER_NOT_FOUND = 'STORAGE_PROVIDER_NOT_FOUND';
    public const CONFIGURATION_NOT_FOUND = 'STORAGE_CONFIGURATION_NOT_FOUND';
    public const FOLDER_NOT_FOUND = 'STORAGE_FOLDER_NOT_FOUND';
    public const FILE_NOT_FOUND = 'STORAGE_FILE_NOT_FOUND';
    public const ACCESS_DENIED = 'STORAGE_ACCESS_DENIED';
    public const UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED';
    public const UPLOAD_NOT_COMPLETED = 'STORAGE_UPLOAD_NOT_COMPLETED';
    public const OBJECT_NOT_FOUND = 'STORAGE_OBJECT_NOT_FOUND';
    public const PROVIDER_ERROR = 'STORAGE_PROVIDER_ERROR';
    public const INVALID_FILE = 'STORAGE_INVALID_FILE';
    public const INVALID_INPUT = 'STORAGE_INVALID_INPUT';
    public const CONFLICT = 'STORAGE_CONFLICT';

    /**
     * @return list<string>
     */
    public static function reasons(): array
    {
        return [
            self::PROVIDER_NOT_FOUND, self::CONFIGURATION_NOT_FOUND, self::FOLDER_NOT_FOUND, self::FILE_NOT_FOUND,
            self::ACCESS_DENIED, self::UPLOAD_FAILED, self::UPLOAD_NOT_COMPLETED, self::OBJECT_NOT_FOUND,
            self::PROVIDER_ERROR, self::INVALID_FILE, self::INVALID_INPUT, self::CONFLICT,
        ];
    }

    public static function providerNotFound(string $type): StorageException
    {
        return new StorageException(self::PROVIDER_NOT_FOUND, 'INVALID_INPUT', "Unsupported storage provider \"{$type}\"", 400);
    }

    public static function configurationNotFound(): StorageException
    {
        return new StorageException(self::CONFIGURATION_NOT_FOUND, 'NOT_FOUND', 'Storage configuration not found', 404);
    }

    public static function folderNotFound(): StorageException
    {
        return new StorageException(self::FOLDER_NOT_FOUND, 'NOT_FOUND', 'Folder not found', 404);
    }

    public static function fileNotFound(): StorageException
    {
        return new StorageException(self::FILE_NOT_FOUND, 'NOT_FOUND', 'File not found', 404);
    }

    public static function objectNotFound(): StorageException
    {
        return new StorageException(self::OBJECT_NOT_FOUND, 'NOT_FOUND', 'Stored object not found', 404);
    }

    public static function accessDenied(): StorageException
    {
        return new StorageException(self::ACCESS_DENIED, 'FORBIDDEN', 'Access to this storage resource is denied', 403);
    }

    public static function invalidFile(string $message): StorageException
    {
        return new StorageException(self::INVALID_FILE, 'VALIDATION_FAILED', $message, 400);
    }

    public static function invalidInput(string $message): StorageException
    {
        return new StorageException(self::INVALID_INPUT, 'VALIDATION_FAILED', $message, 400);
    }

    public static function conflict(string $message): StorageException
    {
        return new StorageException(self::CONFLICT, 'CONFLICT', $message, 409);
    }

    public static function uploadNotCompleted(string $message): StorageException
    {
        return new StorageException(self::UPLOAD_NOT_COMPLETED, 'CONFLICT', $message, 409);
    }

    public static function uploadFailed(string $message): StorageException
    {
        return new StorageException(self::UPLOAD_FAILED, 'CONFLICT', $message, 409);
    }

    /** Never include provider response bodies, hosts or credentials in `$message`. */
    public static function providerError(string $message = 'The storage provider could not complete the request'): StorageException
    {
        return new StorageException(self::PROVIDER_ERROR, 'SERVICE_UNAVAILABLE', $message, 503);
    }

    /**
     * Body validation failure with per-field messages (`details.fields`).
     *
     * @param list<array{field: string, error: string}> $fields
     */
    public static function validation(array $fields): StorageException
    {
        return new StorageException(null, 'VALIDATION_FAILED', 'Validation failed', 400, ['fields' => $fields]);
    }
}
