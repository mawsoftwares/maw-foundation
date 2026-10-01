<?php

declare(strict_types=1);

namespace App\Domain\Job;

enum JobStatus: string
{
    case PENDING = 'PENDING';
    case RUNNING = 'RUNNING';
    case COMPLETED = 'COMPLETED';
    case FAILED = 'FAILED';
    case RETRYING = 'RETRYING';
    case CANCELLED = 'CANCELLED';
}
