<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\File\FileController;
use App\Http\Controllers\Job\JobController;
use App\Http\Controllers\Menu\MenuController;
use App\Http\Controllers\Messaging\EmailTemplateController;
use App\Http\Controllers\Messaging\MessagingController;
use App\Http\Controllers\Order\OrderController;
use App\Http\Controllers\Rbac\ModuleController;
use App\Http\Controllers\Rbac\RoleController;
use App\Http\Controllers\Reporting\ReportingController;
use App\Http\Controllers\Tenant\TenantController;
use App\Http\Controllers\User\UserController;
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

// --- Health ---
Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'maw-foundation-php',
    'timestamp' => now()->toIso8601String(),
]));

// --- Auth (public) ---
Route::prefix('auth')->group(function (): void {
    Route::post('/login', [LoginController::class, 'login']);
    Route::post('/register', [RegisterController::class, 'register']);
    Route::post('/refresh', [LoginController::class, 'refresh']);
    Route::post('/verify-email', [RegisterController::class, 'verifyEmail']);
    Route::post('/forgot-password', [RegisterController::class, 'forgotPassword']);
    Route::post('/reset-password', [RegisterController::class, 'resetPassword']);
});

// --- Auth (authenticated) ---
Route::prefix('auth')->middleware([JwtAuthenticate::class, TenantResolver::class])->group(function (): void {
    Route::post('/logout', [LoginController::class, 'logout']);
    Route::get('/me', [LoginController::class, 'me']);
    Route::get('/sessions', [SessionController::class, 'list']);
    Route::delete('/sessions/{sessionId}', [SessionController::class, 'revoke']);
    Route::delete('/sessions', [SessionController::class, 'revokeAll']);
});

// --- Users (admin) ---
Route::prefix('users')
    ->middleware([JwtAuthenticate::class, TenantResolver::class])
    ->group(function (): void {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::get('/{userId}', [UserController::class, 'show']);
        Route::put('/{userId}', [UserController::class, 'update']);
        Route::delete('/{userId}', [UserController::class, 'destroy']);
        Route::post('/{userId}/activate', [UserController::class, 'activate']);
        Route::post('/{userId}/deactivate', [UserController::class, 'deactivate']);
    });

// --- RBAC ---
Route::middleware([JwtAuthenticate::class, TenantResolver::class])->group(function (): void {
    Route::prefix('roles')->group(function (): void {
        Route::get('/', [RoleController::class, 'index']);
        Route::post('/', [RoleController::class, 'store']);
        Route::get('/{roleId}', [RoleController::class, 'show']);
        Route::put('/{roleId}', [RoleController::class, 'update']);
        Route::delete('/{roleId}', [RoleController::class, 'destroy']);
        Route::get('/{roleId}/permissions', [RoleController::class, 'permissions']);
        Route::put('/{roleId}/permissions', [RoleController::class, 'setPermissions']);
    });

    Route::prefix('modules')->group(function (): void {
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
