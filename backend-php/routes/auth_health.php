<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Middleware\JwtAuthenticate;
use App\Http\Middleware\TenantResolver;
use Illuminate\Support\Facades\Route;

// Health + auth. Registered twice by design — under /api/v1 (routes/api.php) AND at the site root
// (bootstrap/app.php `then:`) — because the Node backend serves them at /health and /auth/* while its
// resources live under /api/v1. One definition, so the two copies cannot drift.

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
