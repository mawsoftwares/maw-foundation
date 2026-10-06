<?php

declare(strict_types=1);

namespace App\Storage\Http\Controllers;

use App\Storage\Http\Validator;
use App\Storage\Services\AttachmentService;
use App\Storage\Services\DownloadService;
use App\Storage\Services\FileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;

final class FileController extends Controller
{
    use Responds;

    public function __construct(
        private readonly FileService $files,
        private readonly DownloadService $downloads,
        private readonly AttachmentService $attachments,
    ) {}

    public function show(Request $request, string $fileId): JsonResponse
    {
        return $this->ok($this->files->getFile($this->actor($request)->tenantId, Validator::uuid($fileId, 'fileId')));
    }

    public function downloadUrl(Request $request, string $fileId): JsonResponse
    {
        return $this->ok($this->downloads->createDownloadUrl(
            $this->actor($request),
            Validator::uuid($fileId, 'fileId'),
            Validator::disposition($request->query('disposition')),
        ));
    }

    public function destroy(Request $request, string $fileId): Response
    {
        $this->files->deleteFile($this->actor($request), Validator::uuid($fileId, 'fileId'));

        return $this->noContent();
    }

    /** `{id}` is a folder UUID or the literal `root`. */
    public function folderFiles(Request $request, string $id): JsonResponse
    {
        $list = Validator::listQuery($request->query());
        $result = $this->files->listFiles($this->actor($request)->tenantId, $list + ['folderId' => Validator::parentRef($id, 'id')]);

        return $this->page($result['items'], $result['total'], $list['page'], $list['pageSize']);
    }

    public function attach(Request $request): JsonResponse
    {
        return $this->ok($this->attachments->attach($this->actor($request), Validator::createAttachment($request->json()->all())), 201);
    }

    public function attachments(Request $request): JsonResponse
    {
        $q = Validator::entityQuery($request->query());

        return $this->ok($this->attachments->list($this->actor($request)->tenantId, $q['entityType'], $q['entityId'], $q['category']));
    }

    public function detach(Request $request, string $id): Response
    {
        $this->attachments->detach($this->actor($request)->tenantId, Validator::uuid($id, 'id'));

        return $this->noContent();
    }
}
