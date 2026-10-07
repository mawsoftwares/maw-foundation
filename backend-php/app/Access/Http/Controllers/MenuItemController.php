<?php

declare(strict_types=1);

namespace App\Access\Http\Controllers;

use App\Domain\Shared\Exceptions\ConflictException;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Shared\Exceptions\ValidationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

/**
 * Menu Management over the shared `menu_items` table (integer ids, key/permission/feature_flag) — the same table,
 * routes and response shapes as the Node backend's menu-routes.ts. `/tree` only needs authentication (every signed-in
 * user renders the nav; the client filters by permission / feature flag); writes need `Manage_Menus`.
 */
final class MenuItemController extends Controller
{
    /** Active items only, nested — what the frontend nav renders. */
    public function tree(): JsonResponse
    {
        $rows = DB::table('menu_items')->where('is_active', true)->orderBy('sort_order')->get();

        return new JsonResponse(['data' => $this->buildTree($rows->map(fn (object $r): array => $this->dto($r))->all())]);
    }

    /** Flat list including inactive items, for the admin screen. */
    public function index(): JsonResponse
    {
        $rows = DB::table('menu_items')->orderBy('sort_order')->get();

        return new JsonResponse(['data' => $rows->map(fn (object $r): array => $this->dto($r))->all()]);
    }

    public function show(string $id): JsonResponse
    {
        return new JsonResponse(['data' => $this->dto($this->find($id))]);
    }

    public function store(Request $request): JsonResponse
    {
        $key = (string) $request->input('key', '');
        $label = (string) $request->input('label', '');
        if ($key === '' || $label === '') {
            throw new ValidationException('key and label are required');
        }
        if (DB::table('menu_items')->where('key', $key)->exists()) {
            throw new ConflictException("A menu item with key \"{$key}\" already exists");
        }

        $id = DB::table('menu_items')->insertGetId([
            'key' => $key,
            'label' => $label,
            'path' => $this->nullable($request, 'path'),
            'icon' => $this->nullable($request, 'icon'),
            'parent_id' => $this->nullable($request, 'parentId'),
            'permission' => $this->nullable($request, 'permission'),
            'feature_flag' => $this->nullable($request, 'featureFlag'),
            'sort_order' => (int) $request->input('sortOrder', 0),
        ]);

        return new JsonResponse(['data' => $this->dto($this->find((string) $id))], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->find($id);

        $parentId = $this->nullable($request, 'parentId');
        if ($parentId !== null && (int) $parentId === (int) $id) {
            throw new ValidationException('A menu item cannot be its own parent');
        }

        DB::table('menu_items')->where('id', (int) $id)->update([
            'label' => $request->input('label'),
            'path' => $this->nullable($request, 'path'),
            'icon' => $this->nullable($request, 'icon'),
            'parent_id' => $parentId,
            'permission' => $this->nullable($request, 'permission'),
            'feature_flag' => $this->nullable($request, 'featureFlag'),
            'sort_order' => (int) $request->input('sortOrder', 0),
            'is_active' => $request->input('isActive') !== false,
            'updated_at' => now(),
        ]);

        return new JsonResponse(['data' => $this->dto($this->find($id))]);
    }

    /** Bulk reorder: [{ id, sortOrder, parentId }] from the admin drag-and-drop tree. */
    public function reorder(Request $request): JsonResponse
    {
        $items = $request->input('items');
        if (! is_array($items)) {
            throw new ValidationException('items must be an array');
        }

        DB::transaction(function () use ($items): void {
            foreach ($items as $item) {
                DB::table('menu_items')->where('id', (int) ($item['id'] ?? 0))->update([
                    'sort_order' => (int) ($item['sortOrder'] ?? 0),
                    'parent_id' => $item['parentId'] ?? null,
                    'updated_at' => now(),
                ]);
            }
        });

        return new JsonResponse(['success' => true]);
    }

    private function find(string $id): object
    {
        $row = ctype_digit($id) ? DB::table('menu_items')->where('id', (int) $id)->first() : null;
        if ($row === null) {
            throw new NotFoundException('Menu item not found');
        }

        return $row;
    }

    /** Empty / missing → null, like Node's `value || null`. */
    private function nullable(Request $request, string $key): string|int|null
    {
        $value = $request->input($key);

        return $value === null || $value === '' || $value === 0 ? null : $value;
    }

    /** @return array<string, mixed> */
    private function dto(object $r): array
    {
        return [
            'id' => (int) $r->id,
            'key' => (string) $r->key,
            'label' => (string) $r->label,
            'path' => $r->path,
            'icon' => $r->icon,
            'parentId' => $r->parent_id !== null ? (int) $r->parent_id : null,
            'permission' => $r->permission,
            'featureFlag' => $r->feature_flag,
            'sortOrder' => (int) $r->sort_order,
            'isActive' => (bool) $r->is_active,
        ];
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    private function buildTree(array $rows): array
    {
        $nodes = [];
        foreach ($rows as $row) {
            $nodes[$row['id']] = $row + ['children' => []];
        }

        $roots = [];
        foreach (array_keys($nodes) as $id) {
            $parent = $nodes[$id]['parentId'];
            if ($parent !== null && isset($nodes[$parent])) {
                $nodes[$parent]['children'][] = &$nodes[$id];
            } else {
                $roots[] = &$nodes[$id];
            }
        }

        $sort = function (array &$list) use (&$sort): void {
            usort($list, fn (array $a, array $b): int => $a['sortOrder'] <=> $b['sortOrder']);
            foreach ($list as &$n) {
                $sort($n['children']);
            }
        };
        $sort($roots);

        return array_values(array_map(fn (array $n): array => $n, $roots));
    }
}
