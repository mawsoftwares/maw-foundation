<?php

declare(strict_types=1);

namespace App\Storage\Http\Controllers;

use App\Storage\Core\StorageSettings;
use App\Storage\Http\Validator;
use App\Storage\Services\UploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class UploadController extends Controller
{
    use Responds;

    public function __construct(private readonly UploadService $uploads, private readonly StorageSettings $settings) {}

    public function request(Request $request): JsonResponse
    {
        return $this->ok($this->uploads->requestUpload($this->actor($request), Validator::createUpload($request->json()->all(), $this->settings)), 201);
    }

    public function complete(Request $request, string $fileId): JsonResponse
    {
        return $this->ok($this->uploads->completeUpload($this->actor($request), Validator::uuid($fileId, 'fileId')));
    }
}
