<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;

class MessagingCredentialModel extends Model
{
    protected $table = 'messaging_credentials';

    protected $primaryKey = 'channel';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'channel',
        'provider',
        'is_configured',
        'config',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_configured' => 'boolean',
            'config' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
