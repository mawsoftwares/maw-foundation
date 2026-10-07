<?php

declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class HealthEndpointTest extends TestCase
{
    #[Test]
    public function health_endpoint_returns_200(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk();
        $response->assertJsonStructure([
            'status',
            'service',
            'timestamp',
        ]);
        $response->assertJson([
            'status' => 'ok',
            'service' => 'maw-foundation-php',
        ]);
    }
}
