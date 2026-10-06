<?php

declare(strict_types=1);

namespace Tests\Contract;

use App\Storage\Core\Errors;
use App\Storage\Http\Validator;
use Illuminate\Routing\Route;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\Yaml\Yaml;
use Tests\TestCase;

/**
 * Keeps the PHP implementation and `contracts/openapi/storage.yaml` from drifting apart — the PHP twin of
 * apps/sample-server/src/modules/storage/__tests__/storage.contract.test.ts.
 */
final class StorageContractTest extends TestCase
{
    /** @var array<string, mixed> */
    private array $spec;

    protected function setUp(): void
    {
        parent::setUp();
        $path = dirname(__DIR__, 3) . '/contracts/openapi/storage.yaml';
        if (! is_file($path)) {
            $this->markTestSkipped('contracts/openapi/storage.yaml not found — run from the monorepo root');
        }
        $this->spec = Yaml::parseFile($path);
    }

    /** @return list<string> `METHOD /path` */
    private function specOperations(): array
    {
        $ops = [];
        foreach ($this->spec['paths'] as $path => $methods) {
            foreach (array_keys($methods) as $method) {
                $ops[] = strtoupper($method) . ' ' . $path;
            }
        }
        sort($ops);

        return $ops;
    }

    /** @return list<string> */
    private function phpOperations(): array
    {
        $ops = [];
        /** @var Route $route */
        foreach ($this->app['router']->getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/storage')) {
                continue;
            }
            foreach ($route->methods() as $method) {
                if ($method !== 'HEAD') {
                    $ops[] = $method . ' /' . preg_replace('/^api\//', 'api/', $route->uri());
                }
            }
        }
        sort($ops);

        return $ops;
    }

    #[Test]
    public function serves_exactly_the_documented_operations(): void
    {
        $php = array_map(static fn (string $o): string => preg_replace('/\{[A-Za-z]+\}/', '{x}', $o), $this->phpOperations());
        $doc = array_map(static fn (string $o): string => preg_replace('/\{[A-Za-z]+\}/', '{x}', $o), $this->specOperations());
        sort($php);
        sort($doc);
        self::assertGreaterThan(15, count($php));
        self::assertSame([], array_values(array_diff($doc, $php)), 'documented in storage.yaml but not served by PHP');
        self::assertSame([], array_values(array_diff($php, $doc)), 'served by PHP but missing from storage.yaml');
    }

    #[Test]
    public function every_documented_permission_guards_the_matching_route(): void
    {
        $required = [];
        foreach ($this->spec['paths'] as $path => $methods) {
            foreach ($methods as $method => $op) {
                if (isset($op['x-required-permission'])) {
                    $required[strtoupper($method) . ' ' . preg_replace('/\{[A-Za-z]+\}/', '{x}', $path)] = $op['x-required-permission'];
                }
            }
        }
        $checked = 0;
        /** @var Route $route */
        foreach ($this->app['router']->getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/storage') || str_contains($route->uri(), '/local/')) {
                continue;
            }
            foreach (array_diff($route->methods(), ['HEAD']) as $method) {
                $key = $method . ' /' . preg_replace('/\{[A-Za-z]+\}/', '{x}', $route->uri());
                $guard = collect($route->gatherMiddleware())->first(static fn ($m) => is_string($m) && str_contains($m, 'RequireStoragePermission:'));
                self::assertNotNull($guard, "{$key} has no permission guard");
                self::assertSame($required[$key] ?? null, substr((string) $guard, strpos((string) $guard, ':') + 1), "permission mismatch for {$key}");
                $checked++;
            }
        }
        self::assertGreaterThan(15, $checked);
    }

    #[Test]
    public function uses_exactly_the_documented_error_reasons_and_providers(): void
    {
        $reasons = $this->spec['components']['schemas']['StorageErrorReason']['enum'];
        sort($reasons);
        $mine = Errors::reasons();
        sort($mine);
        self::assertSame($reasons, $mine);

        $providers = $this->spec['components']['schemas']['CreateStorageConfigurationRequest']['properties']['provider']['enum'];
        sort($providers);
        $known = Validator::PROVIDERS;
        sort($known);
        self::assertSame($providers, $known);
    }

    #[Test]
    public function error_codes_are_all_registered_in_the_shared_contract(): void
    {
        $registry = json_decode((string) file_get_contents(dirname(__DIR__, 3) . '/contracts/errors/error-codes.json'), true, 512, JSON_THROW_ON_ERROR)['codes'];
        foreach ([Errors::providerNotFound('x'), Errors::configurationNotFound(), Errors::folderNotFound(), Errors::fileNotFound(), Errors::objectNotFound(), Errors::accessDenied(), Errors::invalidFile('x'), Errors::invalidInput('x'), Errors::conflict('x'), Errors::uploadNotCompleted('x'), Errors::uploadFailed('x'), Errors::providerError(), Errors::validation([])] as $e) {
            self::assertArrayHasKey($e->errorCode, $registry, "{$e->errorCode} is not in contracts/errors/error-codes.json");
            self::assertSame($registry[$e->errorCode]['httpStatus'], $e->httpStatus, "{$e->errorCode} status differs from the registry");
        }
    }
}
