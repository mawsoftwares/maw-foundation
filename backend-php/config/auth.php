<?php

declare(strict_types=1);

return [
    // Role given to self-registered users (lowest rung of the role ladder).
    'default_registration_role' => env('DEFAULT_REGISTRATION_ROLE', 'viewer'),

    'jwt_secret' => env('JWT_SECRET', 'dev-only-secret-change-me'),
    'jwt_algorithm' => env('JWT_ALGORITHM', 'HS256'),
    'jwt_issuer' => env('JWT_ISSUER', 'maw-foundation'),

    'access_token_ttl' => (int) env('ACCESS_TOKEN_TTL', 900),
    'refresh_token_ttl' => (int) env('REFRESH_TOKEN_TTL', 604800),

    'require_prehash' => (bool) env('REQUIRE_PASSWORD_PREHASH', false),

    'scrypt' => [
        'n' => (int) env('SCRYPT_N', 16384),
        'r' => (int) env('SCRYPT_R', 8),
        'p' => (int) env('SCRYPT_P', 1),
        'key_length' => (int) env('SCRYPT_KEY_LENGTH', 64),
    ],

    'session' => [
        'max_concurrent' => (int) env('MAX_CONCURRENT_SESSIONS', 5),
    ],

    'defaults' => [
        'guard' => 'api',
        'passwords' => 'users',
    ],

    'guards' => [
        'api' => [
            'driver' => 'jwt',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => \App\Infrastructure\Persistence\Eloquent\Models\UserModel::class,
        ],
    ],

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => 10800,
];
