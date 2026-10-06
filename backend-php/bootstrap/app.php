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
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Domain exceptions are handled by App\Shared\Exceptions\Handler

        // MAW Storage: errors on api/v1/storage/* use the contract's standard envelope (scoped to those routes only).
        $exceptions->render(static fn (\Throwable $e, \Illuminate\Http\Request $request) => (new \App\Storage\Http\ExceptionRenderer())->render($e, $request));
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
