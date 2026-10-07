<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Shared\Contracts\AccountStatus;
use App\Domain\Shared\Exceptions\ConflictException;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\Shared\ValueObjects\TenantId;
use App\Domain\Shared\ValueObjects\UserId;
use App\Domain\User\CreateUserData;
use App\Domain\User\UserEntity;
use App\Domain\User\UserRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\UserModel;
use DateTimeImmutable;

final class EloquentUserRepository implements UserRepositoryInterface
{
    public function findById(UserId $id): ?UserEntity
    {
        $model = UserModel::query()->where('id', $id->value)->first();

        return $model ? $this->toEntity($model) : null;
    }

    public function findByEmail(TenantId $tenantId, Email $email): ?UserEntity
    {
        $model = UserModel::query()
            ->where('tenant_id', $tenantId->value)
            ->whereRaw('LOWER(email) = ?', [$email->value])
            ->first();

        return $model ? $this->toEntity($model) : null;
    }

    /**
     * @return UserEntity[]
     */
    public function listByTenant(TenantId $tenantId, int $page = 1, int $pageSize = 20): array
    {
        return UserModel::query()
            ->where('tenant_id', $tenantId->value)
            ->orderByDesc('created_at')
            ->offset(max(0, $page - 1) * $pageSize)
            ->limit($pageSize)
            ->get()
            ->map(fn (UserModel $m): UserEntity => $this->toEntity($m))
            ->values()
            ->all();
    }

    public function countByTenant(TenantId $tenantId): int
    {
        return UserModel::query()->where('tenant_id', $tenantId->value)->count();
    }

    public function create(CreateUserData $data): UserEntity
    {
        $exists = UserModel::query()
            ->where('tenant_id', $data->tenantId->value)
            ->whereRaw('LOWER(email) = ?', [$data->email->value])
            ->exists();
        if ($exists) {
            throw new ConflictException('A user with this email already exists', 'EMAIL_TAKEN');
        }

        $model = UserModel::query()->create([
            'id' => UserId::generate()->value,
            'tenant_id' => $data->tenantId->value,
            'email' => $data->email->value,
            'password_hash' => $data->passwordHash,
            'role' => $data->role,
            'audience' => $data->audience,
            'scope_id' => $data->scopeId,
            'name' => $data->name,
            'account_status' => AccountStatus::from($data->accountStatus)->value,
            'email_verified' => false,
            'mfa_enabled' => false,
        ]);

        return $this->toEntity($model->refresh());
    }

    public function updatePassword(UserId $id, string $passwordHash): void
    {
        UserModel::query()->where('id', $id->value)->update(['password_hash' => $passwordHash, 'updated_at' => now()]);
    }

    public function updateStatus(UserId $id, string $status): void
    {
        UserModel::query()->where('id', $id->value)->update(['account_status' => AccountStatus::from($status)->value, 'updated_at' => now()]);
    }

    public function updateEmailVerified(UserId $id, bool $verified): void
    {
        UserModel::query()->where('id', $id->value)->update(['email_verified' => $verified, 'updated_at' => now()]);
    }

    public function updateLastLogin(UserId $id, string $timestamp): void
    {
        UserModel::query()->where('id', $id->value)->update(['last_login_at' => $timestamp]);
    }

    private function toEntity(UserModel $model): UserEntity
    {
        $at = static fn (mixed $v): DateTimeImmutable => new DateTimeImmutable($v !== null ? (string) $v : 'now');

        return new UserEntity(
            id: UserId::from((string) $model->id),
            tenantId: TenantId::from((string) $model->tenant_id),
            email: Email::from((string) $model->email),
            passwordHash: (string) $model->password_hash,
            role: (string) $model->role,
            audience: (string) $model->audience,
            scopeId: $model->scope_id !== null ? (string) $model->scope_id : null,
            accountStatus: AccountStatus::from((string) $model->account_status),
            emailVerified: (bool) $model->email_verified,
            mfaEnabled: (bool) $model->mfa_enabled,
            name: $model->name !== null ? (string) $model->name : null,
            lastLoginAt: $model->last_login_at !== null ? $at($model->last_login_at) : null,
            createdAt: $at($model->created_at),
            updatedAt: $at($model->updated_at),
        );
    }
}
