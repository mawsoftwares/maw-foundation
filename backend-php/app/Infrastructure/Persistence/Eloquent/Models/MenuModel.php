<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuModel extends Model
{
    use HasUuids;

    protected $table = 'menus';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'label',
        'icon',
        'path',
        'parent_id',
        'module_code',
        'permission_code',
        'sort_order',
        'is_active',
        'tenant_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<self, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}
