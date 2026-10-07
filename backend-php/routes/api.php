<?php

declare(strict_types=1);

use App\Http\Controllers\File\FileController;
use App\Http\Controllers\Job\JobController;
use App\Http\Controllers\Menu\MenuController;
use App\Http\Controllers\Messaging\EmailTemplateController;
use App\Http\Controllers\Messaging\MessagingController;
use App\Http\Controllers\Order\OrderController;
use App\Http\Controllers\Rbac\ModuleController;
use App\Http\Controllers\Reporting\ReportingController;
use App\Http\Controllers\Tenant\TenantController;
use App\Access\Http\Controllers\RoleController as AccessRoleController;
use App\Access\Http\Controllers\ThemeController;
use App\Access\Http\Controllers\UserController as AccessUserController;
use App\Access\Http\Middleware\AccessContext;
use App\Access\Http\Middleware\RequireAccessPermission;
use App\Http\Middleware\JwtAuthenticate;
use App\Http\Middleware\TenantResolver;
use App\Storage\Http\Controllers\ConfigurationController as StorageConfigurationController;
use App\Storage\Http\Controllers\FileController as StorageFileController;
use App\Storage\Http\Controllers\FolderController as StorageFolderController;
use App\Storage\Http\Controllers\LocalGatewayController;
use App\Storage\Http\Controllers\UploadController as StorageUploadController;
use App\Storage\Http\Middleware\RequireStoragePermission;
use App\Storage\Http\Middleware\StorageContext;
use Illuminate\Support\Facades\Route;

// Every API resource lives under /api/v1 (bootstrap/app.php adds /api), matching the Node backend. /health and /auth/*
// are ALSO served at the site root, exactly like Node — see routes/auth_health.php.
Route::prefix('v1')->group(function (): void {
    // --- Health + Auth (shared with the root-level aliases, see routes/auth_health.php) ---
    require __DIR__ . '/auth_health.php';

    // --- Public theme read (login page, no token) — rate limited; exposes only the design.md ---
    Route::get('/theme/public', [ThemeController::class, 'publicShow'])->middleware('throttle:public-read');

    // --- Users + Roles (strict role ladder) ---
    // Same Postgres tables and permissions as the Node backend (users, master_roles, role_permissions). Callers only
    // see / manage users and roles strictly below their own level; see App\Access\RoleHierarchy + AccessPolicy.
    Route::middleware([JwtAuthenticate::class, AccessContext::class])->group(function (): void {
        $can = static fn (string $permission): string => RequireAccessPermission::class . ':' . $permission;

        Route::get('/roles', [AccessRoleController::class, 'assignable']);

        // Application-wide theme: every signed-in user reads it, only Manage_Theme changes it.
        Route::prefix('theme')->group(function () use ($can): void {
            Route::get('/', [ThemeController::class, 'show']);
            Route::put('/', [ThemeController::class, 'update'])->middleware($can('Manage_Theme'));
            Route::delete('/', [ThemeController::class, 'destroy'])->middleware($can('Manage_Theme'));
        });

        Route::prefix('users')->group(function () use ($can): void {
            Route::get('/', [AccessUserController::class, 'index'])->middleware($can('Read_Users'));
            Route::post('/', [AccessUserController::class, 'store'])->middleware($can('Create_Users'));
            Route::get('/{id}', [AccessUserController::class, 'show'])->middleware($can('Read_Users'));
            Route::patch('/{id}', [AccessUserController::class, 'update'])->middleware($can('Update_Users'));
            Route::put('/{id}', [AccessUserController::class, 'update'])->middleware($can('Update_Users'));
            Route::delete('/{id}', [AccessUserController::class, 'destroy'])->middleware($can('Delete_Users'));
            Route::post('/{id}/activate', [AccessUserController::class, 'activate'])->middleware($can('Update_Users'));
            Route::post('/{id}/deactivate', [AccessUserController::class, 'deactivate'])->middleware($can('Update_Users'));
            Route::post('/{id}/reset-password', [AccessUserController::class, 'resetPassword'])->middleware($can('Update_Users'));
        });

        Route::prefix('rbac/roles')->middleware($can('Manage_Rbac'))->group(function (): void {
            Route::get('/', [AccessRoleController::class, 'index']);
            Route::post('/', [AccessRoleController::class, 'store']);
            Route::get('/{id}', [AccessRoleController::class, 'show']);
            Route::put('/{id}', [AccessRoleController::class, 'update']);
            Route::delete('/{id}', [AccessRoleController::class, 'destroy']);
            Route::get('/{id}/permissions', [AccessRoleController::class, 'permissions']);
            Route::post('/{id}/permissions', [AccessRoleController::class, 'setPermissions']);
            Route::put('/{id}/permissions', [AccessRoleController::class, 'setPermissions']);
        });
    });

    // --- RBAC ---
    Route::middleware([JwtAuthenticate::class, TenantResolver::class])->group(function (): void {
        Route::prefix('rbac/modules')->group(function (): void {
            Route::get('/', [ModuleController::class, 'index']);
            Route::get('/tree', [ModuleController::class, 'tree']);
            Route::post('/', [ModuleController::class, 'store']);
            Route::put('/{moduleId}', [ModuleController::class, 'update']);
            Route::delete('/{moduleId}', [ModuleController::class, 'destroy']);
        });

        // --- Menus ---
        Route::prefix('menus')->group(function (): void {
            Route::get('/', [MenuController::class, 'index']);
            Route::get('/tree', [MenuController::class, 'tree']);
            Route::post('/', [MenuController::class, 'store']);
            Route::post('/reorder', [MenuController::class, 'reorder']);
            Route::get('/{id}', [MenuController::class, 'show']);
            Route::put('/{id}', [MenuController::class, 'update']);
        });

        // --- Files ---
        Route::prefix('files')->group(function (): void {
            Route::post('/upload', [FileController::class, 'upload']);
            Route::get('/', [FileController::class, 'index']);
            Route::get('/url/{key}', [FileController::class, 'url']);
            Route::delete('/{key}', [FileController::class, 'destroy']);
        });

        // --- Tenants ---
        Route::prefix('tenants')->group(function (): void {
            Route::get('/', [TenantController::class, 'index']);
            Route::post('/', [TenantController::class, 'store']);
            Route::get('/{id}', [TenantController::class, 'show']);
            Route::patch('/{id}', [TenantController::class, 'update']);
        });

        // --- Orders ---
        Route::prefix('orders')->group(function (): void {
            Route::get('/', [OrderController::class, 'index']);
            Route::post('/', [OrderController::class, 'store']);
            Route::get('/export', [OrderController::class, 'export']);
            Route::get('/{id}', [OrderController::class, 'show']);
        });

        // --- Jobs ---
        Route::prefix('jobs')->group(function (): void {
            Route::get('/', [JobController::class, 'index']);
            Route::post('/', [JobController::class, 'store']);
            Route::get('/{id}', [JobController::class, 'show']);
        });

        // --- Messaging ---
        Route::prefix('messaging')->group(function (): void {
            Route::prefix('email-templates')->group(function (): void {
                Route::get('/', [EmailTemplateController::class, 'index']);
                Route::post('/', [EmailTemplateController::class, 'store']);
                Route::get('/{id}', [EmailTemplateController::class, 'show']);
                Route::put('/{id}', [EmailTemplateController::class, 'update']);
                Route::delete('/{id}', [EmailTemplateController::class, 'destroy']);
            });
            Route::prefix('credentials')->group(function (): void {
                Route::get('/', [MessagingController::class, 'listCredentials']);
                Route::get('/{channel}', [MessagingController::class, 'showCredential']);
                Route::put('/{channel}', [MessagingController::class, 'upsertCredential']);
                Route::delete('/{channel}', [MessagingController::class, 'deleteCredential']);
            });
            Route::get('/logs', [MessagingController::class, 'listLogs']);
            Route::post('/send/email', [MessagingController::class, 'sendEmail']);
            Route::post('/send/sms', [MessagingController::class, 'sendSms']);
            Route::post('/send/whatsapp', [MessagingController::class, 'sendWhatsapp']);
        });

        // --- Reporting ---
        Route::prefix('reporting')->group(function (): void {
            Route::get('/definitions', [ReportingController::class, 'definitions']);
            Route::get('/definitions/{name}/metadata', [ReportingController::class, 'metadata']);
            Route::post('/preview', [ReportingController::class, 'preview']);
            Route::post('/run', [ReportingController::class, 'run']);
            Route::post('/save', [ReportingController::class, 'save']);
            Route::get('/saved', [ReportingController::class, 'savedReports']);
        });
    });
});

// --- Storage (contracts/openapi/storage.yaml) ---
// Tenant and user come only from the verified JWT (StorageContext); access is checked against the same RBAC
// tables the Node backend uses (RequireStoragePermission).
Route::prefix('v1/storage')->group(function (): void {
    // Local-provider direct transfer: the signed token is the authorisation, so no bearer auth here.
    Route::put('/local/{token}', [LocalGatewayController::class, 'put']);
    Route::get('/local/{token}', [LocalGatewayController::class, 'get']);

    Route::middleware([JwtAuthenticate::class, StorageContext::class])->group(function (): void {
        $can = static fn (string $permission): string => RequireStoragePermission::class . ':' . $permission;

        // Uploads (direct-to-provider via signed URL)
        Route::post('/uploads', [StorageUploadController::class, 'request'])->middleware($can('Upload_Storage'));
        Route::post('/uploads/{fileId}/complete', [StorageUploadController::class, 'complete'])->middleware($can('Upload_Storage'));

        // Files
        Route::get('/files/{fileId}', [StorageFileController::class, 'show'])->middleware($can('Read_Storage'));
        Route::get('/files/{fileId}/download-url', [StorageFileController::class, 'downloadUrl'])->middleware($can('Download_Storage'));
        Route::delete('/files/{fileId}', [StorageFileController::class, 'destroy'])->middleware($can('Delete_StorageFiles'));

        // Folders
        Route::get('/folders', [StorageFolderController::class, 'index'])->middleware($can('Read_Storage'));
        Route::post('/folders', [StorageFolderController::class, 'store'])->middleware($can('Create_StorageFolders'));
        Route::patch('/folders/{id}', [StorageFolderController::class, 'update'])->middleware($can('Update_StorageFolders'));
        Route::delete('/folders/{id}', [StorageFolderController::class, 'destroy'])->middleware($can('Delete_StorageFolders'));
        Route::get('/folders/{id}/files', [StorageFileController::class, 'folderFiles'])->middleware($can('Read_Storage'));

        // Attachments (generic entity links)
        Route::post('/attachments', [StorageFileController::class, 'attach'])->middleware($can('Upload_Storage'));
        Route::get('/attachments', [StorageFileController::class, 'attachments'])->middleware($can('Read_Storage'));
        Route::delete('/attachments/{id}', [StorageFileController::class, 'detach'])->middleware($can('Delete_StorageFiles'));

        // Configuration (admin)
        Route::get('/providers', [StorageConfigurationController::class, 'providers'])->middleware($can('Manage_StorageConfiguration'));
        Route::get('/configurations', [StorageConfigurationController::class, 'index'])->middleware($can('Manage_StorageConfiguration'));
        Route::post('/configurations', [StorageConfigurationController::class, 'store'])->middleware($can('Manage_StorageConfiguration'));
        Route::patch('/configurations/{id}', [StorageConfigurationController::class, 'update'])->middleware($can('Manage_StorageConfiguration'));
        Route::delete('/configurations/{id}', [StorageConfigurationController::class, 'destroy'])->middleware($can('Manage_StorageConfiguration'));
        Route::post('/configurations/{id}/test', [StorageConfigurationController::class, 'test'])->middleware($can('Manage_StorageConfiguration'));
    });
});
