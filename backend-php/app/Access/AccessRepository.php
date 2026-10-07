<?php

declare(strict_types=1);

namespace App\Access;

use Illuminate\Support\Facades\DB;

/**
 * Users + roles over the SAME Postgres tables the Node backend uses (`users`, `master_roles`,
 * `role_permissions`), so both backends see and enforce identical data.
 */
final class AccessRepository
{
    private const USER_COLUMNS = 'id, tenant_id, email, role, audience, scope_id, name, phone, account_status, email_verified, mfa_enabled, last_login_at, created_at, updated_at';

    // --- Roles ---

    /**
     * @return list<array{id: int, code: string, name: string, description: ?string, is_active: bool, sort_order: int, level: int}>
     */
    public function roles(): array
    {
        $rows = DB::select('SELECT id, code, name, description, is_active, sort_order, level FROM master_roles ORDER BY sort_order, id');

        return array_values(array_map(static fn (object $r): array => [
            'id' => (int) $r->id,
            'code' => (string) $r->code,
            'name' => (string) $r->name,
            'description' => $r->description !== null ? (string) $r->description : null,
            'is_active' => (bool) $r->is_active,
            'sort_order' => (int) $r->sort_order,
            'level' => (int) $r->level,
        ], $rows));
    }

    /**
     * @return array{id: int, code: string, name: string, description: ?string, is_active: bool, sort_order: int, level: int}|null
     */
    public function roleById(int $id): ?array
    {
        foreach ($this->roles() as $role) {
            if ($role['id'] === $id) {
                return $role;
            }
        }

        return null;
    }

    public function createRole(string $code, string $name, ?string $description, int $sortOrder, int $level): int
    {
        $row = DB::selectOne(
            'INSERT INTO master_roles (code, name, description, sort_order, level) VALUES (?, ?, ?, ?, ?) RETURNING id',
            [$code, $name, $description, $sortOrder, $level],
        );

        return (int) ($row->id ?? 0);
    }

    /**
     * @param array<string, mixed> $fields column => value (name, description, sort_order, is_active, level)
     */
    public function updateRole(int $id, array $fields): void
    {
        $allowed = ['name', 'description', 'sort_order', 'is_active', 'level'];
        $fields = array_intersect_key($fields, array_flip($allowed));
        if ($fields === []) {
            return;
        }
        $sets = implode(', ', array_map(static fn (string $c): string => "{$c} = ?", array_keys($fields)));
        DB::update("UPDATE master_roles SET {$sets}, updated_at = NOW() WHERE id = ?", [...array_values($fields), $id]);
    }

    public function deleteRole(int $id): bool
    {
        return DB::delete('DELETE FROM master_roles WHERE id = ?', [$id]) > 0;
    }

    public function roleCodeExists(string $code): bool
    {
        return DB::selectOne('SELECT 1 AS ok FROM master_roles WHERE code = ?', [$code]) !== null;
    }

    /**
     * @return list<int>
     */
    public function rolePermissionIds(int $roleId): array
    {
        return array_values(array_map(
            static fn (object $r): int => (int) $r->permission_id,
            DB::select('SELECT DISTINCT permission_id FROM role_permissions WHERE role_id = ?', [$roleId]),
        ));
    }

    /**
     * @return list<array{permissionId: int, moduleId: ?int}>
     */
    public function roleAssignments(int $roleId): array
    {
        return array_values(array_map(static fn (object $r): array => [
            'permissionId' => (int) $r->permission_id,
            'moduleId' => $r->module_id !== null ? (int) $r->module_id : null,
        ], DB::select('SELECT permission_id, module_id FROM role_permissions WHERE role_id = ?', [$roleId])));
    }

    /**
     * @param list<array{permissionId: int, moduleId: ?int}> $assignments
     */
    public function replaceRolePermissions(int $roleId, array $assignments): void
    {
        DB::transaction(static function () use ($roleId, $assignments): void {
            DB::delete('DELETE FROM role_permissions WHERE role_id = ?', [$roleId]);
            foreach ($assignments as $a) {
                DB::insert(
                    'INSERT INTO role_permissions (role_id, permission_id, module_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
                    [$roleId, $a['permissionId'], $a['moduleId']],
                );
            }
        });
    }

    public function userHasPermission(string $tenantId, string $userId, string $permission): bool
    {
        $legacy = preg_replace('/_/', '|', $permission, 1) ?? $permission;

        return DB::selectOne(
            'SELECT 1 AS ok FROM users u
               JOIN master_roles r ON r.code = u.role AND r.is_active
               JOIN role_permissions rp ON rp.role_id = r.id
               JOIN master_permissions p ON p.id = rp.permission_id AND p.is_active
              WHERE u.id = ? AND u.tenant_id = ? AND p.code IN (?, ?) LIMIT 1',
            [$userId, $tenantId, $permission, $legacy],
        ) !== null;
    }

    // --- Users ---

    public function userRole(string $tenantId, string $userId): ?string
    {
        $row = DB::selectOne('SELECT role FROM users WHERE id = ? AND tenant_id = ?', [$userId, $tenantId]);

        return $row !== null ? (string) $row->role : null;
    }

    public function findUser(string $tenantId, string $userId): ?object
    {
        return DB::selectOne('SELECT ' . self::USER_COLUMNS . ' FROM users WHERE id = ? AND tenant_id = ?', [$userId, $tenantId]);
    }

    public function emailTaken(string $tenantId, string $email, ?string $exceptUserId = null): bool
    {
        return DB::selectOne(
            "SELECT 1 AS ok FROM users WHERE tenant_id = ? AND LOWER(email) = LOWER(?) AND account_status <> 'DISABLED' AND id <> ?",
            [$tenantId, $email, $exceptUserId ?? ''],
        ) !== null;
    }

    /**
     * @param list<string> $visibleRoles role codes the viewer may see (in addition to themselves)
     * @param array{search?: ?string, status?: ?string, role?: ?string} $filters
     * @return array{items: list<object>, total: int}
     */
    public function listUsers(string $tenantId, array $visibleRoles, string $viewerId, array $filters, int $page, int $limit): array
    {
        $where = ['tenant_id = ?'];
        $bind = [$tenantId];

        if ($visibleRoles === []) {
            $where[] = 'id = ?';
            $bind[] = $viewerId;
        } else {
            $marks = implode(', ', array_fill(0, count($visibleRoles), '?'));
            $where[] = "(role IN ({$marks}) OR id = ?)";
            array_push($bind, ...$visibleRoles, ...[$viewerId]);
        }
        if (($filters['status'] ?? null) === 'SUSPENDED') {
            $where[] = "account_status IN ('SUSPENDED', 'DISABLED')";
        } elseif (($filters['status'] ?? null) !== null) {
            $where[] = 'account_status = ?';
            $bind[] = $filters['status'];
        }
        if (($filters['role'] ?? null) !== null) {
            $where[] = 'role = ?';
            $bind[] = $filters['role'];
        }
        if (($filters['search'] ?? null) !== null) {
            $where[] = '(email ILIKE ? OR name ILIKE ? OR phone ILIKE ?)';
            $term = '%' . $filters['search'] . '%';
            array_push($bind, $term, $term, $term);
        }
        $clause = implode(' AND ', $where);

        $total = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM users WHERE {$clause}", $bind)->c ?? 0);
        $items = DB::select(
            'SELECT ' . self::USER_COLUMNS . " FROM users WHERE {$clause} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [...$bind, $limit, ($page - 1) * $limit],
        );

        return ['items' => array_values($items), 'total' => $total];
    }

    public function createUser(string $id, string $tenantId, string $email, string $role, string $name, ?string $phone, string $passwordHash): void
    {
        DB::insert(
            "INSERT INTO users (id, tenant_id, email, role, audience, password_hash, name, phone, account_status, email_verified)
             VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, 'ACTIVE', FALSE)",
            [$id, $tenantId, $email, $role, $passwordHash, $name, $phone],
        );
    }

    /**
     * @param array<string, mixed> $fields column => value (name, phone, role, account_status, password_hash)
     */
    public function updateUser(string $tenantId, string $userId, array $fields): void
    {
        $fields = array_intersect_key($fields, array_flip(['name', 'phone', 'role', 'account_status', 'password_hash']));
        if ($fields === []) {
            return;
        }
        $sets = implode(', ', array_map(static fn (string $c): string => "{$c} = ?", array_keys($fields)));
        DB::update("UPDATE users SET {$sets}, updated_at = NOW() WHERE id = ? AND tenant_id = ?", [...array_values($fields), $userId, $tenantId]);
    }
}
