<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;

/** The shared `users` table (same one the Node backend uses): one `name` column, upper-case `account_status`. */
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
        'role',
        'audience',
        'scope_id',
        'password_hash',
        'name',
        'phone',
        'avatar',
        'account_status',
        'email_verified',
        'phone_verified',
        'mfa_enabled',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified' => 'boolean',
            'phone_verified' => 'boolean',
            'mfa_enabled' => 'boolean',
            'last_login_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
