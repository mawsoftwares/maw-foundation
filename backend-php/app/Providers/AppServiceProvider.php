<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Auth\SessionRepositoryInterface;
use App\Domain\Auth\TokenBlacklistInterface;
use App\Domain\Auth\TokenServiceInterface;
use App\Domain\File\FileRepositoryInterface;
use App\Domain\Job\JobRepositoryInterface;
use App\Domain\Menu\MenuRepositoryInterface;
use App\Domain\Messaging\MessagingRepositoryInterface;
use App\Domain\Order\OrderRepositoryInterface;
use App\Domain\Rbac\RbacRepositoryInterface;
use App\Domain\Reporting\ReportingRepositoryInterface;
use App\Domain\Tenant\TenantRepositoryInterface;
use App\Domain\User\UserRepositoryInterface;
use App\Infrastructure\Auth\DatabaseTokenBlacklist;
use App\Infrastructure\Auth\JwtTokenService;
use App\Infrastructure\Auth\ScryptPasswordHasher;
use App\Infrastructure\Persistence\Repositories\EloquentFileRepository;
use App\Infrastructure\Persistence\Repositories\EloquentJobRepository;
use App\Infrastructure\Persistence\Repositories\EloquentMenuRepository;
use App\Infrastructure\Persistence\Repositories\EloquentMessagingRepository;
use App\Infrastructure\Persistence\Repositories\EloquentOrderRepository;
use App\Infrastructure\Persistence\Repositories\EloquentRbacRepository;
use App\Infrastructure\Persistence\Repositories\EloquentReportingRepository;
use App\Infrastructure\Persistence\Repositories\EloquentSessionRepository;
use App\Infrastructure\Persistence\Repositories\EloquentTenantRepository;
use App\Infrastructure\Persistence\Repositories\EloquentUserRepository;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        UserRepositoryInterface::class => EloquentUserRepository::class,
        SessionRepositoryInterface::class => EloquentSessionRepository::class,
        TokenBlacklistInterface::class => DatabaseTokenBlacklist::class,
        RbacRepositoryInterface::class => EloquentRbacRepository::class,
        MenuRepositoryInterface::class => EloquentMenuRepository::class,
        FileRepositoryInterface::class => EloquentFileRepository::class,
        TenantRepositoryInterface::class => EloquentTenantRepository::class,
        OrderRepositoryInterface::class => EloquentOrderRepository::class,
        JobRepositoryInterface::class => EloquentJobRepository::class,
        MessagingRepositoryInterface::class => EloquentMessagingRepository::class,
        ReportingRepositoryInterface::class => EloquentReportingRepository::class,
    ];

    public function register(): void
    {
        $this->app->singleton(PasswordHasherInterface::class, function () {
            /** @var array{n: int, r: int, p: int, key_length: int} $scrypt */
            $scrypt = config('auth.scrypt');

            return new ScryptPasswordHasher(
                n: $scrypt['n'],
                r: $scrypt['r'],
                p: $scrypt['p'],
                keyLength: $scrypt['key_length'],
            );
        });

        $this->app->singleton(TokenServiceInterface::class, function () {
            return new JwtTokenService(
                secret: (string) config('auth.jwt_secret'),
                algorithm: (string) config('auth.jwt_algorithm'),
                issuer: (string) config('auth.jwt_issuer'),
            );
        });
    }

    public function boot(): void
    {
        if (app()->environment('production')) {
            $secret = (string) config('auth.jwt_secret');
            if ($secret === 'dev-only-secret-change-me' || strlen($secret) < 32) {
                throw new \RuntimeException(
                    'JWT_SECRET must be at least 32 characters and not the default value in production',
                );
            }
        }
    }
}
