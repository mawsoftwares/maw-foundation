<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;

class UserModel extends Authenticatable
{
    use HasUuids;

    protected $table = 'users';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'email',
        'password_hash',
        'first_name',
        'last_name',
        'phone',
        'role',
        'account_status',
        'email_verified',
        'email_verified_at',
        'verification_token',
        'verification_token_expires_at',
        'password_reset_token',
        'password_reset_token_expires_at',
        'failed_login_attempts',
        'locked_until',
        'last_login_at',
        'mfa_enabled',
        'mfa_secret',
        'mfa_recovery_codes',
    ];

    protected $hidden = [
        'password_hash',
        'mfa_secret',
        'mfa_recovery_codes',
        'verification_token',
        'password_reset_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified' => 'boolean',
            'mfa_enabled' => 'boolean',
            'failed_login_attempts' => 'integer',
            'email_verified_at' => 'datetime',
            'verification_token_expires_at' => 'datetime',
            'password_reset_token_expires_at' => 'datetime',
            'locked_until' => 'datetime',
            'last_login_at' => 'datetime',
            'mfa_recovery_codes' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
