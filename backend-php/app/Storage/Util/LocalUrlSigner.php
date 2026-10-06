<?php

declare(strict_types=1);

namespace App\Storage\Util;

/**
 * Stateless HMAC-SHA256 tokens authorising one upload/download against the local gateway. The format is
 * identical to the Node module (`base64url(json).base64url(hmac)`), so a token minted by either backend
 * is accepted by the other when both share the signing secret and storage root.
 */
final class LocalUrlSigner
{
    public function __construct(private readonly string $secret)
    {
        if (strlen($secret) < 16) {
            throw new \InvalidArgumentException('Local storage signing secret must be at least 16 characters');
        }
    }

    /**
     * @param array<string, mixed> $claims tenantId,configId,key,op,exp,contentType[,contentLength,fileName,disposition]
     */
    public function sign(array $claims): string
    {
        $body = self::b64url(json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return $body . '.' . $this->mac($body);
    }

    /**
     * @return array<string, mixed>|null claims, or null when malformed, tampered with or expired
     */
    public function verify(string $token, ?int $now = null): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return null;
        }
        if (! hash_equals($this->mac($parts[0]), $parts[1])) {
            return null;
        }
        try {
            $claims = json_decode((string) base64_decode(strtr($parts[0], '-_', '+/'), true), true, 16, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }
        if (! is_array($claims) || ! is_int($claims['exp'] ?? null) || $claims['exp'] < ($now ?? time())) {
            return null;
        }
        if (! in_array($claims['op'] ?? null, ['put', 'get'], true)) {
            return null;
        }

        return $claims;
    }

    private function mac(string $body): string
    {
        return self::b64url(hash_hmac('sha256', $body, $this->secret, true));
    }

    private static function b64url(string $bin): string
    {
        return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
    }
}
