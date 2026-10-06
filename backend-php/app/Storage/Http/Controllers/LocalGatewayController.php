<?php

declare(strict_types=1);

namespace App\Storage\Http\Controllers;

use App\Storage\Core\StorageException;
use App\Storage\Providers\LocalStorageProvider;
use App\Storage\Providers\PayloadTooLargeException;
use App\Storage\Services\ConfigurationService;
use App\Storage\Util\LocalUrlSigner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Signed `PUT`/`GET` endpoints that stand in for a bucket's presigned URLs when a tenant uses local disk.
 * Authorisation is the HMAC token (issued only after the normal authenticated, tenant-checked flow), so these
 * routes carry no bearer auth. Responses are NOT enveloped (see contracts/openapi/storage.yaml).
 */
final class LocalGatewayController extends Controller
{
    public function __construct(
        private readonly LocalUrlSigner $signer,
        private readonly ConfigurationService $configurations,
    ) {}

    public function put(Request $request, string $token): \Symfony\Component\HttpFoundation\Response
    {
        $claims = $this->signer->verify($token);
        if ($claims === null || $claims['op'] !== 'put') {
            return new JsonResponse(['error' => 'Invalid or expired upload URL'], 403);
        }
        $mediaType = static fn (?string $v): string => strtolower(trim(explode(';', (string) $v)[0]));
        if ($mediaType($request->headers->get('content-type')) !== $mediaType((string) ($claims['contentType'] ?? ''))) {
            return new JsonResponse(['error' => 'Content-Type does not match the upload request'], 400);
        }
        $declared = (int) ($claims['contentLength'] ?? 0);
        $header = $request->headers->get('content-length');
        if ($header !== null && (int) $header !== $declared) {
            return new JsonResponse(['error' => 'Content-Length does not match the upload request'], 400);
        }
        $provider = $this->provider($claims);
        if ($provider === null) {
            return new JsonResponse(['error' => 'Storage configuration unavailable'], 404);
        }

        try {
            $provider->writeStream((string) $claims['key'], $request->getContent(true), $declared);
        } catch (PayloadTooLargeException) {
            return new JsonResponse(['error' => 'Payload exceeds declared size'], 413);
        } catch (\Throwable) {
            Log::error('Local upload failed');

            return new JsonResponse(['error' => 'Upload failed'], 500);
        }

        return new \Illuminate\Http\Response('', 200);
    }

    public function get(string $token): \Symfony\Component\HttpFoundation\Response
    {
        $claims = $this->signer->verify($token);
        if ($claims === null || $claims['op'] !== 'get') {
            return new JsonResponse(['error' => 'Invalid or expired download URL'], 403);
        }
        $provider = $this->provider($claims);
        if ($provider === null) {
            return new JsonResponse(['error' => 'Storage configuration unavailable'], 404);
        }
        try {
            [$stream, $size] = $provider->openReadStream((string) $claims['key']);
        } catch (StorageException $e) {
            return new JsonResponse(['error' => $e->httpStatus === 404 ? 'Object not found' : 'Download failed'], $e->httpStatus === 404 ? 404 : 500);
        }

        $kind = ($claims['disposition'] ?? 'attachment') === 'inline' ? 'inline' : 'attachment';
        $name = (string) ($claims['fileName'] ?? 'download');
        $ascii = str_replace(['"', '\\'], '_', preg_replace('/[^\x20-\x7e]/', '_', $name) ?? '');

        return new StreamedResponse(static function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => (string) ($claims['contentType'] ?? 'application/octet-stream'),
            'Content-Length' => (string) $size,
            'Content-Disposition' => $kind . '; filename="' . $ascii . '"; filename*=UTF-8\'\'' . rawurlencode($name),
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * @param array<string, mixed> $claims Resolves the tenant's provider; only an active local provider qualifies.
     */
    private function provider(array $claims): ?LocalStorageProvider
    {
        try {
            [, $provider] = $this->configurations->resolve((string) $claims['tenantId'], (string) $claims['configId']);

            return $provider instanceof LocalStorageProvider ? $provider : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
