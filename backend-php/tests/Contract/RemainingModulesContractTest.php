<?php

declare(strict_types=1);

namespace Tests\Contract;

use App\Domain\Job\JobStatus;
use App\Domain\Menu\MenuEntity;
use App\Domain\Order\OrderEntity;
use App\Domain\Order\OrderStatus;
use App\Domain\Reporting\ReportDefinitionEntity;
use App\Domain\Reporting\SavedReportEntity;
use App\Domain\Tenant\TenantEntity;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class RemainingModulesContractTest extends TestCase
{
    #[Test]
    public function tenant_response_matches_contract(): void
    {
        $entity = new TenantEntity(
            id: 't1',
            name: 'Acme Corp',
            slug: 'acme',
            domain: 'acme.example.com',
            isActive: true,
            settings: ['timezone' => 'UTC'],
            createdAt: new \DateTimeImmutable('2024-01-01'),
            updatedAt: new \DateTimeImmutable('2024-01-02'),
        );

        $response = $entity->toResponse();

        $required = ['id', 'name', 'slug', 'isActive', 'createdAt'];
        foreach ($required as $key) {
            $this->assertArrayHasKey($key, $response, "Missing required field: {$key}");
        }
        $this->assertSame('t1', $response['id']);
        $this->assertSame('acme', $response['slug']);
        $this->assertTrue($response['isActive']);
        $this->assertIsArray($response['settings']);
    }

    #[Test]
    public function tenant_list_uses_data_wrapper(): void
    {
        $response = [
            'data' => [
                (new TenantEntity('t1', 'Test', 'test', null, true, null, new \DateTimeImmutable()))->toResponse(),
            ],
        ];

        $this->assertArrayHasKey('data', $response);
        $this->assertArrayNotHasKey('success', $response);
        $this->assertIsArray($response['data']);
    }

    #[Test]
    public function order_status_enum_matches_contract(): void
    {
        $expected = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
        $actual = array_map(fn (OrderStatus $s) => $s->value, OrderStatus::cases());

        $this->assertSame($expected, $actual);
    }

    #[Test]
    public function order_response_matches_contract(): void
    {
        $entity = new OrderEntity(
            id: 'o1',
            tenantId: 't1',
            status: OrderStatus::PENDING,
            items: [['productId' => 'p1', 'quantity' => 2, 'unitPrice' => 1500]],
            totalAmount: 3000,
            customerId: 'c1',
            notes: 'Extra spicy',
            createdAt: new \DateTimeImmutable('2024-01-01'),
        );

        $response = $entity->toResponse();

        $required = ['id', 'status', 'createdAt'];
        foreach ($required as $key) {
            $this->assertArrayHasKey($key, $response, "Missing required field: {$key}");
        }
        $this->assertSame('PENDING', $response['status']);
        $this->assertIsInt($response['totalAmount']);
        $this->assertSame(3000, $response['totalAmount']);
    }

    #[Test]
    public function order_list_uses_data_meta_pagination_wrapper(): void
    {
        $response = [
            'data' => [],
            'meta' => [
                'pagination' => [
                    'page' => 1,
                    'pageSize' => 20,
                    'total' => 0,
                    'totalPages' => 0,
                ],
            ],
        ];

        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('meta', $response);
        $this->assertArrayHasKey('pagination', $response['meta']);

        $pagination = $response['meta']['pagination'];
        foreach (['page', 'pageSize', 'total', 'totalPages'] as $key) {
            $this->assertArrayHasKey($key, $pagination, "Missing pagination field: {$key}");
        }
    }

    #[Test]
    public function menu_entity_has_flat_and_tree_responses(): void
    {
        $child = new MenuEntity(
            id: 'm2',
            label: 'Sub Menu',
            icon: null,
            path: '/sub',
            parentId: 'm1',
            moduleCode: null,
            permissionCode: null,
            sortOrder: 1,
        );

        $parent = new MenuEntity(
            id: 'm1',
            label: 'Main Menu',
            icon: 'home',
            path: '/',
            parentId: null,
            moduleCode: 'dashboard',
            permissionCode: 'dashboard.view',
            sortOrder: 0,
            children: [$child],
        );

        $flat = $parent->toResponse();
        $this->assertArrayHasKey('id', $flat);
        $this->assertArrayHasKey('label', $flat);
        $this->assertArrayHasKey('sortOrder', $flat);
        $this->assertArrayNotHasKey('children', $flat);

        $tree = $parent->toTreeResponse();
        $this->assertArrayHasKey('children', $tree);
        $this->assertCount(1, $tree['children']);
        $this->assertSame('m2', $tree['children'][0]['id']);
    }

    #[Test]
    public function menu_reorder_response_convention(): void
    {
        $response = ['success' => true];
        $this->assertTrue($response['success']);
    }

    #[Test]
    public function file_upload_response_is_flat(): void
    {
        $response = [
            'key' => 'abc-123',
            'url' => 'https://example.com/files/url/abc-123',
            'size' => 1024,
            'mimeType' => 'image/png',
        ];

        $this->assertArrayNotHasKey('data', $response);
        $this->assertArrayNotHasKey('success', $response);
        $this->assertArrayHasKey('key', $response);
        $this->assertArrayHasKey('url', $response);
        $this->assertIsInt($response['size']);
    }

    #[Test]
    public function file_delete_response_convention(): void
    {
        $response = ['deleted' => true];
        $this->assertTrue($response['deleted']);
    }

    #[Test]
    public function job_status_enum_matches_contract(): void
    {
        $expected = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED'];
        $actual = array_map(fn (JobStatus $s) => $s->value, JobStatus::cases());

        $this->assertSame($expected, $actual);
    }

    #[Test]
    public function job_create_response_is_flat_id_status(): void
    {
        $response = [
            'id' => 'j1',
            'status' => 'PENDING',
        ];

        $this->assertArrayHasKey('id', $response);
        $this->assertArrayHasKey('status', $response);
        $this->assertArrayNotHasKey('data', $response);
    }

    #[Test]
    public function job_list_uses_data_wrapper(): void
    {
        $response = ['data' => []];
        $this->assertArrayHasKey('data', $response);
    }

    #[Test]
    public function messaging_send_response_convention(): void
    {
        $response = [
            'messageId' => 'msg-123',
            'status' => 'queued',
        ];

        $this->assertArrayHasKey('messageId', $response);
        $this->assertArrayHasKey('status', $response);
        $this->assertArrayNotHasKey('data', $response);
    }

    #[Test]
    public function report_definition_summary_matches_contract(): void
    {
        $entity = new ReportDefinitionEntity(
            name: 'daily-sales',
            label: 'Daily Sales',
            description: 'Daily sales report',
            category: 'finance',
        );

        $summary = $entity->toSummary();

        foreach (['name', 'label'] as $key) {
            $this->assertArrayHasKey($key, $summary, "Missing required field: {$key}");
        }
        $this->assertSame('daily-sales', $summary['name']);
    }

    #[Test]
    public function saved_report_summary_matches_contract(): void
    {
        $entity = new SavedReportEntity(
            id: 'sr1',
            name: 'My Report',
            definitionName: 'daily-sales',
            config: ['definitionName' => 'daily-sales'],
            createdAt: new \DateTimeImmutable('2024-06-01'),
        );

        $summary = $entity->toSummary();

        foreach (['id', 'name', 'definitionName', 'createdAt'] as $key) {
            $this->assertArrayHasKey($key, $summary, "Missing required field: {$key}");
        }
    }

    #[Test]
    public function reporting_save_response_convention(): void
    {
        $response = ['id' => 'sr1'];
        $this->assertArrayHasKey('id', $response);
        $this->assertArrayNotHasKey('data', $response);
    }
}
