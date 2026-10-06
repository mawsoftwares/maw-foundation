<?php

declare(strict_types=1);

namespace App\Storage\Http\Controllers;

use App\Storage\Http\Validator;
use App\Storage\Services\FolderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;

final class FolderController extends Controller
{
    use Responds;

    public function __construct(private readonly FolderService $folders) {}

    /** `?parentId=` omitted or `root` lists root folders. */
    public function index(Request $request): JsonResponse
    {
        $list = Validator::listQuery($request->query());
        $result = $this->folders->list($this->actor($request)->tenantId, $list + ['parentId' => Validator::parentRef($request->query('parentId'), 'parentId')]);

        return $this->page($result['items'], $result['total'], $list['page'], $list['pageSize']);
    }

    public function store(Request $request): JsonResponse
    {
        return $this->ok($this->folders->create($this->actor($request), Validator::createFolder($request->json()->all())), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return $this->ok($this->folders->update($this->actor($request)->tenantId, Validator::uuid($id, 'id'), Validator::updateFolder($request->json()->all())));
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->folders->delete($this->actor($request)->tenantId, Validator::uuid($id, 'id'));

        return $this->noContent();
    }
}
