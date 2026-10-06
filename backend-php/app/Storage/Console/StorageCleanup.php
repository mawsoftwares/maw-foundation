<?php

declare(strict_types=1);

namespace App\Storage\Console;

use App\Storage\Core\StorageSettings;
use App\Storage\Services\CleanupService;
use Illuminate\Console\Command;

/** `php artisan storage:cleanup` — abandoned uploads and interrupted deletions (scheduled hourly by default). */
final class StorageCleanup extends Command
{
    protected $signature = 'storage:cleanup {--hours= : Treat pending uploads older than this many hours as abandoned}';
    protected $description = 'Fail abandoned storage uploads and retry interrupted object deletions';

    public function handle(CleanupService $cleanup, StorageSettings $settings): int
    {
        $hours = $this->option('hours') !== null ? max(1, (int) $this->option('hours')) : $settings->pendingUploadMaxAgeHours;
        $report = $cleanup->run($hours);
        $this->info(sprintf('abandoned=%d retriedDeletions=%d errors=%d', $report['abandonedUploads'], $report['retriedDeletions'], $report['errors']));

        return $report['errors'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
