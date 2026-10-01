<?php

declare(strict_types=1);

namespace App\Http\Controllers\File;

use App\Domain\File\FileRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

final class FileController extends Controller
{
    public function __construct(
        private readonly FileRepositoryInterface $files,
    ) {}

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file',
            'category' => 'sometimes|string|nullable',
            'description' => 'sometimes|string|nullable',
        ]);

        $uploaded = $request->file('file');
        $key = Str::uuid()->toString();
        $uploaded->storeAs('uploads', $key);

        $this->files->create([
            'key' => $key,
            'originalName' => $uploaded->getClientOriginalName(),
            'mimeType' => $uploaded->getClientMimeType(),
            'size' => $uploaded->getSize(),
            'category' => $request->input('category'),
            'description' => $request->input('description'),
            'uploadedBy' => $request->input('uploaded_by'),
            'tenantId' => $request->input('tenant_id'),
        ]);

        return new JsonResponse([
            'key' => $key,
            'url' => url("files/url/{$key}"),
            'size' => $uploaded->getSize(),
            'mimeType' => $uploaded->getClientMimeType(),
        ], 201);
    }

    public function index(): JsonResponse
    {
        $files = $this->files->list();

        return new JsonResponse([
            'data' => array_map(fn ($f) => $f->toResponse(), $files),
        ]);
    }

    public function url(string $key): JsonResponse
    {
        $file = $this->files->findByKey($key);

        if (! $file) {
            throw new NotFoundException('File not found');
        }

        return new JsonResponse([
            'url' => url("files/url/{$key}"),
        ]);
    }

    public function destroy(string $key): JsonResponse
    {
        $deleted = $this->files->delete($key);

        if (! $deleted) {
            throw new NotFoundException('File not found');
        }

        return new JsonResponse(['deleted' => true]);
    }
}
