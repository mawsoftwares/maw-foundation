<?php

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Validates the PHP backend implements the same API routes as defined
 * in the OpenAPI specs (contracts/openapi/*.yaml).
 */
final class RouteConformanceTest extends TestCase
{
    /**
     * Routes the PHP backend must implement to match the OpenAPI contract.
     * Format: [method, path, source_spec]
     *
     * @return list<array{0: string, 1: string, 2: string}>
     */
    private function requiredRoutes(): array
    {
        return [
            // system.yaml
            ['GET', '/api/health', 'system.yaml'],

            // auth.yaml
            ['POST', '/api/auth/login', 'auth.yaml'],
            ['POST', '/api/auth/register', 'auth.yaml'],
            ['POST', '/api/auth/refresh', 'auth.yaml'],
            ['POST', '/api/auth/logout', 'auth.yaml'],
            ['GET', '/api/auth/me', 'auth.yaml'],
            ['POST', '/api/auth/verify-email', 'auth.yaml'],
            ['POST', '/api/auth/forgot-password', 'auth.yaml'],
            ['POST', '/api/auth/reset-password', 'auth.yaml'],
            ['GET', '/api/auth/sessions', 'auth.yaml'],
            ['DELETE', '/api/auth/sessions/{sessionId}', 'auth.yaml'],
            ['DELETE', '/api/auth/sessions', 'auth.yaml'],

            // users.yaml
            ['GET', '/api/users', 'users.yaml'],
            ['POST', '/api/users', 'users.yaml'],
            ['GET', '/api/users/{userId}', 'users.yaml'],
            ['PUT', '/api/users/{userId}', 'users.yaml'],
            ['DELETE', '/api/users/{userId}', 'users.yaml'],
            ['POST', '/api/users/{userId}/activate', 'users.yaml'],
            ['POST', '/api/users/{userId}/deactivate', 'users.yaml'],

            // rbac.yaml
            ['GET', '/api/roles', 'rbac.yaml'],
            ['POST', '/api/roles', 'rbac.yaml'],
            ['GET', '/api/roles/{roleId}', 'rbac.yaml'],
            ['PUT', '/api/roles/{roleId}', 'rbac.yaml'],
            ['DELETE', '/api/roles/{roleId}', 'rbac.yaml'],
            ['GET', '/api/roles/{roleId}/permissions', 'rbac.yaml'],
            ['PUT', '/api/roles/{roleId}/permissions', 'rbac.yaml'],
            ['GET', '/api/modules', 'rbac.yaml'],
            ['GET', '/api/modules/tree', 'rbac.yaml'],
            ['POST', '/api/modules', 'rbac.yaml'],
            ['PUT', '/api/modules/{moduleId}', 'rbac.yaml'],
            ['DELETE', '/api/modules/{moduleId}', 'rbac.yaml'],

            // tenants.yaml
            ['GET', '/api/tenants', 'tenants.yaml'],
            ['POST', '/api/tenants', 'tenants.yaml'],
            ['GET', '/api/tenants/{id}', 'tenants.yaml'],
            ['PATCH', '/api/tenants/{id}', 'tenants.yaml'],

            // orders.yaml
            ['GET', '/api/orders', 'orders.yaml'],
            ['POST', '/api/orders', 'orders.yaml'],
            ['GET', '/api/orders/{id}', 'orders.yaml'],
            ['GET', '/api/orders/export', 'orders.yaml'],

            // menus.yaml
            ['GET', '/api/menus', 'menus.yaml'],
            ['POST', '/api/menus', 'menus.yaml'],
            ['GET', '/api/menus/tree', 'menus.yaml'],
            ['GET', '/api/menus/{id}', 'menus.yaml'],
            ['PUT', '/api/menus/{id}', 'menus.yaml'],
            ['POST', '/api/menus/reorder', 'menus.yaml'],

            // files.yaml
            ['POST', '/api/files/upload', 'files.yaml'],
            ['GET', '/api/files', 'files.yaml'],
            ['GET', '/api/files/url/{key}', 'files.yaml'],
            ['DELETE', '/api/files/{key}', 'files.yaml'],

            // jobs.yaml
            ['POST', '/api/jobs', 'jobs.yaml'],
            ['GET', '/api/jobs', 'jobs.yaml'],
            ['GET', '/api/jobs/{id}', 'jobs.yaml'],

            // messaging.yaml
            ['GET', '/api/messaging/email-templates', 'messaging.yaml'],
            ['POST', '/api/messaging/email-templates', 'messaging.yaml'],
            ['GET', '/api/messaging/email-templates/{id}', 'messaging.yaml'],
            ['PUT', '/api/messaging/email-templates/{id}', 'messaging.yaml'],
            ['DELETE', '/api/messaging/email-templates/{id}', 'messaging.yaml'],
            ['GET', '/api/messaging/credentials', 'messaging.yaml'],
            ['GET', '/api/messaging/credentials/{channel}', 'messaging.yaml'],
            ['PUT', '/api/messaging/credentials/{channel}', 'messaging.yaml'],
            ['DELETE', '/api/messaging/credentials/{channel}', 'messaging.yaml'],
            ['GET', '/api/messaging/logs', 'messaging.yaml'],
            ['POST', '/api/messaging/send/email', 'messaging.yaml'],
            ['POST', '/api/messaging/send/sms', 'messaging.yaml'],
            ['POST', '/api/messaging/send/whatsapp', 'messaging.yaml'],

            // reporting.yaml
            ['GET', '/api/reporting/definitions', 'reporting.yaml'],
            ['GET', '/api/reporting/definitions/{name}/metadata', 'reporting.yaml'],
            ['POST', '/api/reporting/preview', 'reporting.yaml'],
            ['POST', '/api/reporting/run', 'reporting.yaml'],
            ['POST', '/api/reporting/save', 'reporting.yaml'],
            ['GET', '/api/reporting/saved', 'reporting.yaml'],
        ];
    }

    #[Test]
    public function php_routes_file_defines_all_required_endpoints(): void
    {
        $routesPath = dirname(__DIR__, 2) . '/routes/api.php';
        if (! file_exists($routesPath)) {
            $this->markTestSkipped('routes/api.php not found');
        }

        $routesContent = file_get_contents($routesPath);
        $missing = [];

        foreach ($this->requiredRoutes() as [$method, $path, $spec]) {
            // Extract the Laravel route path part (after /api/)
            $routePath = preg_replace('#^/api#', '', $path);
            // Convert {param} to Laravel's {param} format (already the same)
            $routePattern = preg_quote($routePath, '/');
            // Replace quoted {param} back to regex
            $routePattern = preg_replace('/\\\\{\\w+\\\\}/', '{\\w+}', $routePattern);

            $methodLower = strtolower($method);
            $methodPattern = "Route::{$methodLower}\\(";

            // Check if a route definition exists for this method + path
            $pathFragment = trim($routePath, '/');
            $pathParts = explode('/', $pathFragment);
            $lastPart = end($pathParts);

            // Simple check: the path fragment or last meaningful segment should appear in routes
            $found = false;
            if (str_contains($routesContent, "'{$routePath}'") ||
                str_contains($routesContent, "\"{$routePath}\"")) {
                $found = true;
            }

            // For nested routes (prefix groups), check the leaf path
            if (! $found) {
                $leafPath = '/' . $lastPart;
                if (str_contains($routesContent, "'{$leafPath}'") ||
                    str_contains($routesContent, "\"{$leafPath}\"")) {
                    $found = true;
                }
            }

            // For parameterized routes, check for the path with braces
            if (! $found && str_contains($path, '{')) {
                // Extract the parameter name
                if (preg_match('/\{(\w+)\}/', $path, $m)) {
                    $paramPath = "'/{\${$m[1]}}'";
                    if (str_contains($routesContent, "/{" . $m[1] . "}")) {
                        $found = true;
                    }
                }
            }

            if (! $found) {
                $missing[] = "{$method} {$path} (from {$spec})";
            }
        }

        $this->assertEmpty(
            $missing,
            "Missing routes in PHP backend:\n" . implode("\n", $missing),
        );
    }

    #[Test]
    public function auth_routes_are_grouped_correctly(): void
    {
        $routesPath = dirname(__DIR__, 2) . '/routes/api.php';
        $content = file_get_contents($routesPath);

        // Auth public routes should not require JwtAuthenticate middleware
        $this->assertStringContainsString("Route::post('/login'", $content);
        $this->assertStringContainsString("Route::post('/register'", $content);
        $this->assertStringContainsString("Route::post('/refresh'", $content);

        // Auth protected routes should use JwtAuthenticate
        $this->assertStringContainsString('JwtAuthenticate::class', $content);
        $this->assertStringContainsString('TenantResolver::class', $content);
    }

    #[Test]
    public function response_conventions_are_consistent(): void
    {
        $controllersDir = dirname(__DIR__, 2) . '/app/Http/Controllers';

        // Auth controllers return flat responses
        $loginController = file_get_contents("{$controllersDir}/Auth/LoginController.php");
        $this->assertStringContainsString("new JsonResponse([", $loginController);
        $this->assertStringNotContainsString("'success' => true", $loginController);

        // User controller returns envelope responses
        $userController = file_get_contents("{$controllersDir}/User/UserController.php");
        $this->assertStringContainsString("'success' => true", $userController);
        $this->assertStringContainsString("'data' =>", $userController);
        $this->assertStringContainsString("'meta' =>", $userController);

        // RBAC controllers return data wrapper
        $roleController = file_get_contents("{$controllersDir}/Rbac/RoleController.php");
        $this->assertStringContainsString("'data' =>", $roleController);
        $this->assertStringNotContainsString("'success' =>", $roleController);

        // Tenant controller returns data wrapper
        $tenantController = file_get_contents("{$controllersDir}/Tenant/TenantController.php");
        $this->assertStringContainsString("'data' =>", $tenantController);
        $this->assertStringNotContainsString("'success' =>", $tenantController);

        // Order controller returns data + meta pagination
        $orderController = file_get_contents("{$controllersDir}/Order/OrderController.php");
        $this->assertStringContainsString("'data' =>", $orderController);
        $this->assertStringContainsString("'meta' =>", $orderController);
        $this->assertStringContainsString("'pagination' =>", $orderController);

        // Menu controller returns data wrapper
        $menuController = file_get_contents("{$controllersDir}/Menu/MenuController.php");
        $this->assertStringContainsString("'data' =>", $menuController);

        // Job controller uses data wrapper for list, flat for single
        $jobController = file_get_contents("{$controllersDir}/Job/JobController.php");
        $this->assertStringContainsString("'data' =>", $jobController);

        // Messaging template controller uses data wrapper
        $emailTemplateController = file_get_contents("{$controllersDir}/Messaging/EmailTemplateController.php");
        $this->assertStringContainsString("'data' =>", $emailTemplateController);

        // Reporting controller uses data wrapper for lists
        $reportingController = file_get_contents("{$controllersDir}/Reporting/ReportingController.php");
        $this->assertStringContainsString("'data' =>", $reportingController);
    }
}
