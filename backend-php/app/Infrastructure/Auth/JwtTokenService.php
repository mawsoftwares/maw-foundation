<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Domain\Auth\TokenServiceInterface;
use App\Domain\Shared\Exceptions\UnauthorizedException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\SignatureInvalidException;

final class JwtTokenService implements TokenServiceInterface
{
    public function __construct(
        private readonly string $secret,
        private readonly string $algorithm = 'HS256',
        private readonly string $issuer = 'maw-foundation',
    ) {}

    /**
     * @param array<string, mixed> $claims
     */
    public function sign(array $claims): string
    {
        $now = time();

        $payload = array_merge($claims, [
            'iss' => $this->issuer,
            'iat' => $now,
        ]);

        if (! isset($payload['exp']) && isset($claims['expiresIn'])) {
            $payload['exp'] = $now + (int) $claims['expiresIn'];
            unset($payload['expiresIn']);
        }

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * @return array<string, mixed>
     */
    public function verify(string $token): array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));

            return (array) $decoded;
        } catch (ExpiredException) {
            throw new UnauthorizedException('TOKEN_EXPIRED', 'Token has expired');
        } catch (SignatureInvalidException) {
            throw new UnauthorizedException('INVALID_TOKEN', 'Invalid token signature');
        } catch (\Throwable) {
            throw new UnauthorizedException('INVALID_TOKEN', 'Token verification failed');
        }
    }
}
