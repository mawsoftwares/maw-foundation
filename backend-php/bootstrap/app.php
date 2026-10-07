<?php

declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: 'api',
        health: '/up',
        // Root-level /health and /auth/* (no /api prefix) so a client built for the Node backend works unchanged.
        then: static function (): void {
            \Illuminate\Support\Facades\Route::middleware('api')->group(__DIR__ . '/../routes/auth_health.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Domain exceptions are handled by App\Shared\Exceptions\Handler

        // MAW Storage: errors on api/v1/storage/* use the contract's standard envelope (scoped to those routes only).
        $exceptions->render(static fn (\Throwable $e, \Illuminate\Http\Request $request) => (new \App\Storage\Http\ExceptionRenderer())->render($e, $request));

        // Domain exceptions (403 / 404 / 409 / 400 ...) keep their own status and flat `{error, code}` body instead of
        // surfacing as a 500. Runs after the storage renderer, which returns null for non-storage routes.
        $exceptions->render(static function (\App\Domain\Shared\Exceptions\DomainException $e, \Illuminate\Http\Request $request) {
            return $request->is('api/*', 'auth/*', 'health', 'me', 'modules')
                ? new \Illuminate\Http\JsonResponse($e->toApiError(), $e->httpStatus)
                : null;
        });
    })
    ->withCommands([\App\Storage\Console\StorageCleanup::class])
    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule): void {
        // Abandoned uploads / interrupted deletions. STORAGE_CLEANUP_INTERVAL_MINUTES=0 disables the schedule.
        $minutes = (int) config('storage.cleanup_interval_minutes', 60);
        if ($minutes > 0) {
            $schedule->command('storage:cleanup')->cron($minutes >= 60 ? '0 * * * *' : "*/{$minutes} * * * *")->withoutOverlapping();
        }
    })
    ->create();
