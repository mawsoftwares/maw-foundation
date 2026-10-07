<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UserSessionModel extends Model
{
    use HasUuids;

    protected $table = 'user_sessions';

    protected $keyType = 'string';

    public $incrementing = false;

    /** `user_sessions` has created_at but no updated_at, so Eloquent must not manage timestamps. */
    public $timestamps = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'user_id',
        'refresh_token_hash',
        'ip_address',
        'user_agent',
        'created_at',
        'last_active_at',
        'expires_at',
        'revoked_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_active_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
