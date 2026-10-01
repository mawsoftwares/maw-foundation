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
