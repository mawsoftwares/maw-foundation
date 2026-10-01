<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PermissionModel extends Model
{
    use HasUuids;

    protected $table = 'permissions';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'module_id',
        'name',
        'slug',
        'description',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
