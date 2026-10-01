<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Shared\Contracts\AccountStatus;
use App\Domain\Shared\Exceptions\ConflictException;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\User\CreateUserData;
use App\Domain\User\UserEntity;
use App\Domain\User\UserRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Support\Str;

final class EloquentUserRepository implements UserRepositoryInterface
{
    public function findById(string $tenantId, string $userId): ?UserEntity
    {
        $model = UserModel::where('tenant_id', $tenantId)
            ->where('id', $userId)
            ->first();

        return $model ? $this->toEntity($model) : null;
    }

    public function findByEmail(string $tenantId, string $email): ?UserEntity
    {
        $model = UserModel::where('tenant_id', $tenantId)
            ->where('email', strtolower($email))
            ->first();

        return $model ? $this->toEntity($model) : null;
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{items: list<UserEntity>, total: int}
     */
    public function list(string $tenantId, int $page = 1, int $limit = 20, array $filters = []): array
    {
        $query = UserModel::where('tenant_id', $tenantId);

        if (isset($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        if (isset($filters['status'])) {
            $query->where('account_status', $filters['status']);
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search): void {
                $q->where('email', 'ilike', "%{$search}%")
                    ->orWhere('first_name', 'ilike', "%{$search}%")
                    ->orWhere('last_name', 'ilike', "%{$search}%");
            });
        }

        $total = $query->count();

        $items = $query->orderBy('created_at', 'desc')
            ->offset(($page - 1) * $limit)
            ->limit($limit)
            ->get()
            ->map(fn (UserModel $m) => $this->toEntity($m))
            ->all();

        return ['items' => array_values($items), 'total' => $total];
    }

    public function create(string $tenantId, CreateUserData $data): UserEntity
    {
        $existing = UserModel::where('tenant_id', $tenantId)
            ->where('email', $data->email->value())
            ->exists();

        if ($existing) {
            throw new ConflictException('A user with this email already exists');
        }

        $model = UserModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'email' => $data->email->value(),
            'password_hash' => $data->passwordHash,
            'first_name' => $data->firstName,
            'last_name' => $data->lastName,
            'phone' => $data->phone,
            'role' => $data->role,
            'account_status' => AccountStatus::PENDING_VERIFICATION->value,
            'email_verified' => false,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        return $this->toEntity($model);
    }

    /**
     * @param array<string, mixed> $fields
     */
    public function update(string $tenantId, string $userId, array $fields): UserEntity
    {
        $model = UserModel::where('tenant_id', $tenantId)
            ->where('id', $userId)
            ->first();

        if (! $model) {
            throw new NotFoundException('User not found');
        }

        $allowedFields = [
            'first_name', 'last_name', 'phone', 'role', 'account_status',
            'email_verified', 'email_verified_at', 'password_hash',
            'verification_token', 'verification_token_expires_at',
            'password_reset_token', 'password_reset_token_expires_at',
            'failed_login_attempts', 'locked_until', 'last_login_at',
            'mfa_enabled', 'mfa_secret', 'mfa_recovery_codes',
        ];

        $filtered = array_intersect_key($fields, array_flip($allowedFields));
        $model->update($filtered);

        return $this->toEntity($model->fresh() ?? $model);
    }

    public function delete(string $tenantId, string $userId): bool
    {
        return (bool) UserModel::where('tenant_id', $tenantId)
            ->where('id', $userId)
            ->delete();
    }

    public function count(string $tenantId): int
    {
        return UserModel::where('tenant_id', $tenantId)->count();
    }

    private function toEntity(UserModel $model): UserEntity
    {
        return new UserEntity(
            id: $model->id,
            tenantId: $model->tenant_id,
            email: Email::from($model->email),
            passwordHash: $model->password_hash,
            firstName: $model->first_name,
            lastName: $model->last_name,
            phone: $model->phone,
            role: $model->role,
            accountStatus: AccountStatus::from($model->account_status),
            emailVerified: (bool) $model->email_verified,
            failedLoginAttempts: (int) $model->failed_login_attempts,
            mfaEnabled: (bool) $model->mfa_enabled,
            createdAt: $model->created_at ? new \DateTimeImmutable($model->created_at->toIso8601String()) : null,
            updatedAt: $model->updated_at ? new \DateTimeImmutable($model->updated_at->toIso8601String()) : null,
        );
    }
}
