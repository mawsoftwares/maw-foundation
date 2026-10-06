<?php

declare(strict_types=1);

/*
| MAW Storage — shared with the Node backend (same STORAGE_* variables, same defaults).
| STORAGE_ENCRYPTION_KEY and STORAGE_LOCAL_SIGNING_SECRET MUST match the Node backend's values when both
| backends serve the same database, so each can decrypt credentials and accept the other's signed URLs.
*/
return [
    'local_root' => env('STORAGE_LOCAL_ROOT', storage_path('app/maw-storage')),
    // `?:` (not env() defaults) so an EMPTY variable also falls back instead of producing an invalid secret/key.
    'local_signing_secret' => env('STORAGE_LOCAL_SIGNING_SECRET') ?: env('JWT_SECRET') ?: 'dev-only-secret-change-me',
    'public_url' => env('PUBLIC_URL') ?: env('APP_URL') ?: 'http://localhost:8000',
    // 32 bytes as 64 hex characters. Falls back to MFA_ENCRYPTION_KEY, then the all-zero development key.
    'encryption_key' => env('STORAGE_ENCRYPTION_KEY') ?: env('MFA_ENCRYPTION_KEY') ?: str_repeat('0', 64),
    'upload_url_ttl_seconds' => (int) env('STORAGE_UPLOAD_URL_TTL_SECONDS', 900),
    'download_url_ttl_seconds' => (int) env('STORAGE_DOWNLOAD_URL_TTL_SECONDS', 300),
    'max_file_size_bytes' => (int) env('STORAGE_MAX_FILE_SIZE_BYTES', 104857600),
    'allowed_mime_types' => env('STORAGE_ALLOWED_MIME_TYPES', ''),
    'pending_upload_max_age_hours' => (int) env('STORAGE_PENDING_UPLOAD_MAX_AGE_HOURS', 24),
    'cleanup_interval_minutes' => (int) env('STORAGE_CLEANUP_INTERVAL_MINUTES', 60),
];
