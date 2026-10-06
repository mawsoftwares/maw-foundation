<?php

declare(strict_types=1);

namespace App\Storage\Services;

use App\Storage\Core\Actor;
use App\Storage\Core\Errors;
use App\Storage\Core\StorageAttachment;
use App\Storage\Core\StorageFile;
use App\Storage\Repositories\AttachmentRepository;
use App\Storage\Repositories\FileRepository;

/** Generic file ↔ entity links; knows nothing about invoices, employees, etc. */
final class AttachmentService
{
    public function __construct(
        private readonly AttachmentRepository $attachments,
        private readonly FileRepository $files,
    ) {}

    /**
     * @param array{fileId: string, entityType: string, entityId: string, category: string} $input
     * @return array<string, mixed>
     */
    public function attach(Actor $actor, array $input): array
    {
        $file = $this->files->findById($actor->tenantId, $input['fileId']) ?? throw Errors::fileNotFound();
        if ($file->status !== StorageFile::UPLOADED) {
            throw Errors::uploadNotCompleted('Only uploaded files can be attached');
        }

        return $this->attachments->create([...$input, 'tenantId' => $actor->tenantId, 'createdBy' => $actor->userId])->toView();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(string $tenantId, string $entityType, string $entityId, ?string $category = null): array
    {
        return array_map(static fn (StorageAttachment $a): array => $a->toView(), $this->attachments->listByEntity($tenantId, $entityType, $entityId, $category));
    }

    public function detach(string $tenantId, string $id): void
    {
        if (! $this->attachments->delete($tenantId, $id)) {
            throw Errors::fileNotFound();
        }
    }
}
