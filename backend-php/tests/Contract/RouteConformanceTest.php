<?php

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

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
            ['GET', '/api/v1/health', 'system.yaml'],

            // auth.yaml
            ['POST', '/api/v1/auth/login', 'auth.yaml'],
            ['POST', '/api/v1/auth/register', 'auth.yaml'],
            ['POST', '/api/v1/auth/refresh', 'auth.yaml'],
            ['POST', '/api/v1/auth/logout', 'auth.yaml'],
            ['GET', '/api/v1/auth/me', 'auth.yaml'],
            ['POST', '/api/v1/auth/verify-email', 'auth.yaml'],
            ['POST', '/api/v1/auth/forgot-password', 'auth.yaml'],
            ['POST', '/api/v1/auth/reset-password', 'auth.yaml'],
            ['GET', '/api/v1/auth/sessions', 'auth.yaml'],
            ['DELETE', '/api/v1/auth/sessions/{sessionId}', 'auth.yaml'],
            ['DELETE', '/api/v1/auth/sessions', 'auth.yaml'],

            // users.yaml
            ['GET', '/api/v1/users', 'users.yaml'],
            ['POST', '/api/v1/users', 'users.yaml'],
            ['GET', '/api/v1/users/{id}', 'users.yaml'],
            ['PUT', '/api/v1/users/{id}', 'users.yaml'],
            ['DELETE', '/api/v1/users/{id}', 'users.yaml'],
            ['POST', '/api/v1/users/{id}/activate', 'users.yaml'],
            ['POST', '/api/v1/users/{id}/deactivate', 'users.yaml'],

            // rbac.yaml
            ['GET', '/api/v1/rbac/roles', 'rbac.yaml'],
            ['POST', '/api/v1/rbac/roles', 'rbac.yaml'],
            ['GET', '/api/v1/rbac/roles/{id}', 'rbac.yaml'],
            ['PUT', '/api/v1/rbac/roles/{id}', 'rbac.yaml'],
            ['DELETE', '/api/v1/rbac/roles/{id}', 'rbac.yaml'],
            ['GET', '/api/v1/rbac/roles/{id}/permissions', 'rbac.yaml'],
            ['PUT', '/api/v1/rbac/roles/{id}/permissions', 'rbac.yaml'],
            ['GET', '/api/v1/rbac/modules', 'rbac.yaml'],
            ['GET', '/api/v1/rbac/modules/tree', 'rbac.yaml'],
            ['POST', '/api/v1/rbac/modules', 'rbac.yaml'],
            ['PUT', '/api/v1/rbac/modules/{moduleId}', 'rbac.yaml'],
            ['DELETE', '/api/v1/rbac/modules/{moduleId}', 'rbac.yaml'],

            // tenants.yaml
            ['GET', '/api/v1/tenants', 'tenants.yaml'],
            ['POST', '/api/v1/tenants', 'tenants.yaml'],
            ['GET', '/api/v1/tenants/{id}', 'tenants.yaml'],
            ['PATCH', '/api/v1/tenants/{id}', 'tenants.yaml'],

            // orders.yaml
            ['GET', '/api/v1/orders', 'orders.yaml'],
            ['POST', '/api/v1/orders', 'orders.yaml'],
            ['GET', '/api/v1/orders/{id}', 'orders.yaml'],
            ['GET', '/api/v1/orders/export', 'orders.yaml'],

            // menus.yaml
            ['GET', '/api/v1/menus', 'menus.yaml'],
            ['POST', '/api/v1/menus', 'menus.yaml'],
            ['GET', '/api/v1/menus/tree', 'menus.yaml'],
            ['GET', '/api/v1/menus/{id}', 'menus.yaml'],
            ['PUT', '/api/v1/menus/{id}', 'menus.yaml'],
            ['POST', '/api/v1/menus/reorder', 'menus.yaml'],

            // files.yaml
            ['POST', '/api/v1/files/upload', 'files.yaml'],
            ['GET', '/api/v1/files', 'files.yaml'],
            ['GET', '/api/v1/files/url/{key}', 'files.yaml'],
            ['DELETE', '/api/v1/files/{key}', 'files.yaml'],

            // jobs.yaml
            ['POST', '/api/v1/jobs', 'jobs.yaml'],
            ['GET', '/api/v1/jobs', 'jobs.yaml'],
            ['GET', '/api/v1/jobs/{id}', 'jobs.yaml'],

            // messaging.yaml
            ['GET', '/api/v1/messaging/email-templates', 'messaging.yaml'],
            ['POST', '/api/v1/messaging/email-templates', 'messaging.yaml'],
            ['GET', '/api/v1/messaging/email-templates/{id}', 'messaging.yaml'],
            ['PUT', '/api/v1/messaging/email-templates/{id}', 'messaging.yaml'],
            ['DELETE', '/api/v1/messaging/email-templates/{id}', 'messaging.yaml'],
            ['GET', '/api/v1/messaging/credentials', 'messaging.yaml'],
            ['GET', '/api/v1/messaging/credentials/{channel}', 'messaging.yaml'],
            ['PUT', '/api/v1/messaging/credentials/{channel}', 'messaging.yaml'],
            ['DELETE', '/api/v1/messaging/credentials/{channel}', 'messaging.yaml'],
            ['GET', '/api/v1/messaging/logs', 'messaging.yaml'],
            ['POST', '/api/v1/messaging/send/email', 'messaging.yaml'],
            ['POST', '/api/v1/messaging/send/sms', 'messaging.yaml'],
            ['POST', '/api/v1/messaging/send/whatsapp', 'messaging.yaml'],

            // reporting.yaml
            ['GET', '/api/v1/reporting/definitions', 'reporting.yaml'],
            ['GET', '/api/v1/reporting/definitions/{name}/metadata', 'reporting.yaml'],
            ['POST', '/api/v1/reporting/preview', 'reporting.yaml'],
            ['POST', '/api/v1/reporting/run', 'reporting.yaml'],
            ['POST', '/api/v1/reporting/save', 'reporting.yaml'],
            ['GET', '/api/v1/reporting/saved', 'reporting.yaml'],
        ];
    }

    #[Test]
    public function php_routes_file_defines_all_required_endpoints(): void
    {
        // Introspect the REAL route table (a text search cannot see `Route::get('/')` inside a prefix group).
        $registered = [];
        foreach ($this->app['router']->getRoutes() as $route) {
            foreach ($route->methods() as $method) {
                $registered[$method . ' ' . preg_replace('/\{\w+\??\}/', '{}', '/' . ltrim($route->uri(), '/'))] = true;
            }
        }

        $missing = [];
        foreach ($this->requiredRoutes() as [$method, $path, $spec]) {
            $key = $method . ' ' . preg_replace('/\{\w+\}/', '{}', $path);
            if (! isset($registered[$key])) {
                $missing[] = "{$method} {$path} (from {$spec})";
            }
        }

        $this->assertEmpty($missing, "Missing routes in PHP backend:\n" . implode("\n", $missing));
    }

    #[Test]
    public function auth_routes_are_grouped_correctly(): void
    {
        // Auth routes live in the shared file that is registered both under /api/v1 and at the site root.
        $content = (string) file_get_contents(dirname(__DIR__, 2) . '/routes/auth_health.php');

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

        // Auth controllers return flat responses (tokens / profile at the top level, no `data` envelope)
        $loginController = file_get_contents("{$controllersDir}/Auth/LoginController.php");
        $this->assertStringContainsString("new JsonResponse([", $loginController);
        $this->assertStringNotContainsString("'data' =>", $loginController);

        // User controller returns envelope responses
        $userController = file_get_contents("{$controllersDir}/../../Access/Http/Controllers/UserController.php");
        $this->assertStringContainsString("'success' => true", $userController);
        $this->assertStringContainsString("'data' =>", $userController);
        $this->assertStringContainsString("'meta' =>", $userController);

        // RBAC controllers return data wrapper
        $roleController = file_get_contents("{$controllersDir}/../../Access/Http/Controllers/RoleController.php");
        $this->assertStringContainsString("'data' =>", $roleController);

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
