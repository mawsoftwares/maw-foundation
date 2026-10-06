<?php

declare(strict_types=1);

namespace App\Storage\Core;

use App\Domain\Shared\Exceptions\DomainException;

/**
 * Storage error. `errorCode` is a standard foundation code; `reason` is the precise STORAGE_* reason
 * (contracts/openapi/storage.yaml → StorageErrorReason). Never put provider internals in the message.
 */
final class StorageException extends DomainException
{
    /**
     * @param array<string, mixed> $details
     */
    public function __construct(
        public readonly ?string $reason,
        string $errorCode,
        string $message,
        int $httpStatus,
        public readonly array $details = [],
    ) {
        parent::__construct($message, $errorCode, $httpStatus);
    }

    /**
     * Standard envelope used by the storage contract.
     *
     * @return array<string, mixed>
     */
    public function toEnvelope(?string $requestId = null): array
    {
        $details = $this->details;
        if ($this->reason !== null) {
            $details['reason'] = $this->reason;
        }

        return [
            'success' => false,
            'error' => array_filter([
                'code' => $this->errorCode,
                'message' => $this->getMessage(),
                'details' => $details === [] ? null : $details,
                'requestId' => $requestId,
            ], static fn ($v) => $v !== null),
        ];
    }
}
