<?php

declare(strict_types=1);

namespace App\Storage\Util;

use App\Storage\Core\Errors;

/**
 * AES-256-GCM, `v1:<iv hex>:<ciphertext hex>:<tag hex>` — byte-compatible with the Node module's
 * `AesEncryptionService`, so either backend can read credentials the other wrote (same key required).
 */
final class CredentialCipher
{
    private const VERSION = 'v1';
    private const IV_LENGTH = 12;
    private const TAG_LENGTH = 16;

    private readonly string $key;

    public function __construct(string $keyHex)
    {
        $key = ctype_xdigit($keyHex) && strlen($keyHex) === 64 ? hex2bin($keyHex) : false;
        if ($key === false) {
            throw new \InvalidArgumentException('Storage encryption key must be 32 bytes (64 hex characters)');
        }
        $this->key = $key;
    }

    public function encrypt(string $accessKeyId, string $secretAccessKey): string
    {
        $plaintext = json_encode(['accessKeyId' => $accessKeyId, 'secretAccessKey' => $secretAccessKey], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        return $this->encryptRaw($plaintext);
    }

    /**
     * @return array{accessKeyId: string, secretAccessKey: string}
     */
    public function decrypt(string $ciphertext): array
    {
        try {
            $parsed = json_decode($this->decryptRaw($ciphertext), true, 8, JSON_THROW_ON_ERROR);
            if (! is_array($parsed) || ! is_string($parsed['accessKeyId'] ?? null) || ! is_string($parsed['secretAccessKey'] ?? null)) {
                throw new \RuntimeException('malformed');
            }

            return ['accessKeyId' => $parsed['accessKeyId'], 'secretAccessKey' => $parsed['secretAccessKey']];
        } catch (\Throwable) {
            throw Errors::providerError('Stored credentials could not be decrypted');
        }
    }

    public function encryptRaw(string $plaintext): string
    {
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';
        $encrypted = openssl_encrypt($plaintext, 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, $iv, $tag, '', self::TAG_LENGTH);
        if ($encrypted === false) {
            throw Errors::providerError('Credentials could not be encrypted');
        }

        return implode(':', [self::VERSION, bin2hex($iv), bin2hex($encrypted), bin2hex($tag)]);
    }

    public function decryptRaw(string $ciphertext): string
    {
        $parts = explode(':', $ciphertext);
        if (count($parts) !== 4 || $parts[0] !== self::VERSION) {
            throw new \RuntimeException('Invalid ciphertext format');
        }
        $plain = openssl_decrypt((string) hex2bin($parts[2]), 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, (string) hex2bin($parts[1]), (string) hex2bin($parts[3]));
        if ($plain === false) {
            throw new \RuntimeException('Decryption failed');
        }

        return $plain;
    }
}
