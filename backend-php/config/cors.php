<?php

declare(strict_types=1);

return [
    // Include Node-compatible root aliases (/auth/*, /me, /modules, /health), not only /api/*.
    'paths' => ['api/*', 'auth/*', 'health', 'me', 'modules', 'up'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'CORS_ALLOWED_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000',
        )),
    ))),
    'allowed_origins_patterns' => [
        // Vite bumps the port when 5173 is taken (5174, 5175, …).
        '#^https?://(localhost|127\.0\.0\.1):\d+$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['x-request-id'],
    'max_age' => 86400,
    'supports_credentials' => true,
];
