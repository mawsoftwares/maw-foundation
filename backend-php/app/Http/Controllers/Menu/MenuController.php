<?php

declare(strict_types=1);

namespace App\Http\Controllers\Menu;

use App\Domain\Menu\MenuRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class MenuController extends Controller
{
    public function __construct(
        private readonly MenuRepositoryInterface $menus,
    ) {}

    public function index(): JsonResponse
    {
        $menus = $this->menus->list();

        return new JsonResponse([
            'data' => array_map(fn ($m) => $m->toResponse(), $menus),
        ]);
    }

    public function tree(): JsonResponse
    {
        $tree = $this->menus->getTree();

        return new JsonResponse([
            'data' => array_map(fn ($m) => $m->toTreeResponse(), $tree),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $menu = $this->menus->findById($id);

        if (! $menu) {
            throw new NotFoundException('Menu not found');
        }

        return new JsonResponse(['data' => $menu->toResponse()]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'label' => 'required|string',
            'icon' => 'sometimes|string|nullable',
            'path' => 'sometimes|string|nullable',
            'parentId' => 'sometimes|string|nullable',
            'moduleCode' => 'sometimes|string|nullable',
            'permissionCode' => 'sometimes|string|nullable',
            'sortOrder' => 'sometimes|integer',
        ]);

        $menu = $this->menus->create($request->all());

        return new JsonResponse(['data' => $menu->toResponse()], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'label' => 'sometimes|string',
            'icon' => 'sometimes|string|nullable',
            'path' => 'sometimes|string|nullable',
            'parentId' => 'sometimes|string|nullable',
            'moduleCode' => 'sometimes|string|nullable',
            'permissionCode' => 'sometimes|string|nullable',
            'sortOrder' => 'sometimes|integer',
            'isActive' => 'sometimes|boolean',
        ]);

        $menu = $this->menus->update($id, $request->all());

        return new JsonResponse(['data' => $menu->toResponse()]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|string',
            'items.*.sortOrder' => 'required|integer',
        ]);

        $this->menus->reorder($request->input('items'));

        return new JsonResponse(['success' => true]);
    }
}
