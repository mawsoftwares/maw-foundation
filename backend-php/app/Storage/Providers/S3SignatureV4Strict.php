<?php

declare(strict_types=1);

namespace App\Storage\Providers;

use Aws\Signature\S3SignatureV4;

/**
 * The AWS SDK deliberately leaves `Content-Type` and `Content-Length` out of presigned URLs. For uploads we
 * WANT them signed — exactly like the Node module — so storage rejects an upload whose type or size differs
 * from what was declared when the URL was issued.
 */
final class S3SignatureV4Strict extends S3SignatureV4
{
    /**
     * @return array<string, bool>
     */
    protected function getHeaderBlacklist(): array
    {
        $list = parent::getHeaderBlacklist();
        unset($list['content-length']);

        return $list;
    }

    /**
     * @return array<string, bool>
     */
    protected function getPresignHeaderDenyList(): array
    {
        $list = parent::getPresignHeaderDenyList();
        unset($list['content-type']);

        return $list;
    }
}
