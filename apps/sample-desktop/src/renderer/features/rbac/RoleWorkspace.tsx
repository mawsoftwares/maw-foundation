import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Banner, Button, ConfirmationDialog, Divider, Drawer, ErrorState,
  IconButton, PageLoader, SearchBar, Select, TextField, Tooltip, useForm, useToast,
} from '@mawsoftwares/ui-web';
import { joinPermissionCode } from '@mawsoftwares/rbac-core';
import { ModuleCard } from './ModuleCard';
import {
  addPermissionToModule, createModule, deleteModule, deletePermission,
  fetchPermissionAssignments, fetchRoleWorkspace, rbacErrorMessage,
  saveRoleAssignments, updateModule, updatePermission,
} from './api';
import {
  actionCodeFromName, applyAssignment, assignmentsFromModules, filterModules, pascalToken,
  permissionDisplayName, suggestModuleCode, suggestPermissionCode, summarizeModules,
} from './workspace-model';
import type {
  AssignmentFilter, Role, StatusFilter, WorkspaceModule, WorkspacePermission, WorkspaceSummary,
} from './types';
import { DEFAULT_MODULE_ACTIONS } from './types';

const defaultNewModulePermissions = DEFAULT_MODULE_ACTIONS
  .filter((action) => action.key !== 'Export')
  .map((action) => ({ key: action.key, name: action.label }));

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type DrawerState =
  | { type: 'module'; mode: 'create' }
  | { type: 'module'; mode: 'edit'; module: WorkspaceModule }
  | { type: 'permission'; mode: 'create'; moduleId: number | null }
  | { type: 'permission'; mode: 'edit'; moduleId: number; permission: WorkspacePermission }
  | { type: 'manage'; moduleId: number }
  | null;

type ConfirmState =
  | { type: 'clear-module'; module: WorkspaceModule }
  | { type: 'remove-all' }
  | { type: 'delete-permission'; permission: WorkspacePermission; roleCount: number }
  | { type: 'delete-module'; module: WorkspaceModule }
  | { type: 'deactivate-module'; module: WorkspaceModule }
  | null;

export function RoleWorkspace({ role, onClose, onRoleUpdated }: {
  role: Role;
  onClose?: () => void;
  onRoleUpdated?: (role: Role) => void;
}): ReactNode {
  const toast = useToast();
  const [modules, setModules] = useState<WorkspaceModule[]>([]);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestModules = useRef<WorkspaceModule[]>([]);
  const savedModules = useRef<WorkspaceModule[]>([]);

  const load = useCallback(async (opts?: { focusModuleId?: number; silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(undefined);
    try {
      const data = await fetchRoleWorkspace(role.id);
      setModules(data.modules);
      setSummary(data.summary);
      latestModules.current = data.modules;
      savedModules.current = data.modules;
      setExpanded((prev) => {
        if (opts?.focusModuleId !== undefined) return new Set([opts.focusModuleId]);
        if (prev.size > 0) return prev;
        return new Set(data.modules.map((m) => m.id));
      });
      if (opts?.focusModuleId !== undefined) {
        requestAnimationFrame(() => {
          document.getElementById(`rbac-module-${opts.focusModuleId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } catch (e) {
      setError(rbacErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [role.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const persistAssignments = useCallback((next: WorkspaceModule[]) => {
    latestModules.current = next;
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const run = async () => {
        const snapshot = latestModules.current;
        try {
          await saveRoleAssignments(role.id, assignmentsFromModules(snapshot));
          savedModules.current = snapshot;
          if (latestModules.current === snapshot) setSaveState('saved');
          else persistAssignments(latestModules.current);
        } catch (e) {
          setModules(savedModules.current);
          latestModules.current = savedModules.current;
          setSummary(summarizeModules(savedModules.current));
          setSaveState('error');
          toast.error(rbacErrorMessage(e));
        }
      };
      void run();
    }, 400);
  }, [role.id, toast]);

  const updateModules = useCallback((next: WorkspaceModule[], persist: boolean) => {
    setModules(next);
    setSummary(summarizeModules(next));
    latestModules.current = next;
    if (persist) persistAssignments(next);
  }, [persistAssignments]);

  const togglePermission = (permissionId: number, assigned: boolean) => {
    updateModules(applyAssignment(modules, new Set([permissionId]), assigned), true);
  };

  const requestToggleAll = (mod: WorkspaceModule, assign: boolean) => {
    if (!assign && mod.assignedCount > 0) {
      setConfirm({ type: 'clear-module', module: mod });
      return;
    }
    const ids = new Set(mod.permissions.map((p) => p.id));
    updateModules(applyAssignment(modules, ids, assign), true);
  };

  const visible = useMemo(
    () => filterModules(modules, { search, assignment: assignmentFilter, status: statusFilter }),
    [modules, search, assignmentFilter, statusFilter],
  );

  const liveSummary = summary ?? summarizeModules(modules);

  if (error) return <ErrorState title="Failed to load RBAC workspace" message={error} retry={() => void load()} />;
  if (loading && modules.length === 0) return <PageLoader message="Loading modules and permissions..." />;

  return (
    <>
    <div style={{
      border: '1px solid var(--maw-border)',
      borderRadius: 'var(--maw-radius-lg)',
      background: 'var(--maw-surface)',
      overflow: 'hidden',
    }}>
      <RoleHeader
        role={role}
        summary={liveSummary}
        saveState={saveState}
        onAddModule={() => setDrawer({ type: 'module', mode: 'create' })}
        onAddPermission={() => setDrawer({ type: 'permission', mode: 'create', moduleId: null })}
        onAssignAll={() => {
          const ids = new Set(modules.flatMap((m) => m.permissions.map((p) => p.id)));
          updateModules(applyAssignment(modules, ids, true), true);
        }}
        onRemoveAll={() => setConfirm({ type: 'remove-all' })}
        onClose={onClose}
      />

      <Divider style={{ margin: 0 }} />

      <div style={{ padding: 'var(--maw-space-sm) var(--maw-space-lg) var(--maw-space-md)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search modules or permissions..."
            style={{ flex: '1 1 200px' }}
          />
        </div>
        <FilterRow
          assignment={assignmentFilter}
          status={statusFilter}
          onAssignment={setAssignmentFilter}
          onStatus={setStatusFilter}
        />

        {saveState === 'error' && (
          <Banner variant="danger" style={{ marginBottom: 8 }}>Could not save permission assignments. Changes were reverted.</Banner>
        )}

        {modules.length === 0 ? (
          <div style={{ padding: 'var(--maw-space-lg) 0', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
            No modules found.{' '}
            <Button variant="ghost" onClick={() => setDrawer({ type: 'module', mode: 'create' })} style={{ fontSize: 'var(--maw-text-xs)', padding: '2px 8px' }}>+ Add Module</Button>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 'var(--maw-space-md) 0', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>No modules match.</div>
        ) : (
          visible.map((mod, index) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                expanded={expanded.has(mod.id)}
                showDivider={index > 0}
                onToggleExpanded={() => {
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(mod.id)) next.delete(mod.id); else next.add(mod.id);
                    return next;
                  });
                }}
                onTogglePermission={togglePermission}
                onToggleAll={(assign) => requestToggleAll(mod, assign)}
                onEditModule={() => setDrawer({ type: 'module', mode: 'edit', module: mod })}
                onDeactivateModule={() => setConfirm({ type: 'deactivate-module', module: mod })}
                onDeleteModule={() => setConfirm({ type: 'delete-module', module: mod })}
                onManagePermissions={() => setDrawer({ type: 'manage', moduleId: mod.id })}
              />
            ))
          )}
        </div>
      </div>

      <ManagePermissionsDrawer
        module={drawer?.type === 'manage' ? modules.find((m) => m.id === drawer.moduleId) ?? null : null}
        onClose={() => setDrawer(null)}
        onTogglePermission={togglePermission}
        onAdded={async () => {
          await load({ silent: true });
        }}
        onDelete={(permission) => {
          void fetchPermissionAssignments(permission.id)
            .then((usage) => setConfirm({ type: 'delete-permission', permission, roleCount: usage.count }))
            .catch((e) => toast.error(rbacErrorMessage(e)));
        }}
      />

      <ModuleDrawer
        state={drawer?.type === 'module' ? drawer : null}
        modules={modules}
        onClose={() => setDrawer(null)}
        onCreated={async (moduleId) => {
          setDrawer(null);
          await load({ focusModuleId: moduleId });
        }}
        onUpdated={async () => {
          setDrawer(null);
          await load();
        }}
        onPermissionsChanged={async () => {
          await load({ silent: true });
        }}
        onDeletePermission={(permission) => {
          void fetchPermissionAssignments(permission.id)
            .then((usage) => setConfirm({ type: 'delete-permission', permission, roleCount: usage.count }))
            .catch((e) => toast.error(rbacErrorMessage(e)));
        }}
      />

      <PermissionDrawer
        state={drawer?.type === 'permission' ? drawer : null}
        modules={modules.filter((m) => !m.isVirtual)}
        onClose={() => setDrawer(null)}
        onCreated={async (moduleId) => {
          setDrawer(null);
          await load({ focusModuleId: moduleId });
        }}
        onUpdated={async (moduleId) => {
          setDrawer(null);
          await load({ focusModuleId: moduleId });
        }}
      />

      <ConfirmationDialog
        open={confirm !== null}
        title={confirmTitle(confirm)}
        message={confirmMessage(confirm)}
        variant={confirm?.type === 'remove-all' || confirm?.type === 'delete-permission' || confirm?.type === 'delete-module' || confirm?.type === 'clear-module' ? 'danger' : 'primary'}
        confirmLabel={confirmConfirmLabel(confirm)}
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          void (async () => {
            if (!confirm) return;
            setConfirmLoading(true);
            try {
              if (confirm.type === 'clear-module') {
                const ids = new Set(confirm.module.permissions.map((p) => p.id));
                updateModules(applyAssignment(latestModules.current, ids, false), true);
              } else if (confirm.type === 'remove-all') {
                const ids = new Set(latestModules.current.flatMap((m) => m.permissions.map((p) => p.id)));
                updateModules(applyAssignment(latestModules.current, ids, false), true);
              } else if (confirm.type === 'delete-permission') {
                await deletePermission(confirm.permission.id);
                toast.success('Permission deleted');
                await load({ silent: true });
              } else if (confirm.type === 'delete-module') {
                await deleteModule(confirm.module.id);
                toast.success('Module deleted');
                await load();
              } else if (confirm.type === 'deactivate-module') {
                await updateModule(confirm.module.id, {
                  name: confirm.module.name,
                  description: confirm.module.description ?? undefined,
                  sortOrder: confirm.module.sortOrder,
                  isActive: !confirm.module.isActive,
                  parentModuleId: confirm.module.parentModuleId,
                });
                toast.success(confirm.module.isActive ? 'Module deactivated' : 'Module activated');
                await load({ focusModuleId: confirm.module.id });
                onRoleUpdated?.(role);
              }
              setConfirm(null);
            } catch (e) {
              toast.error(rbacErrorMessage(e));
            } finally {
              setConfirmLoading(false);
            }
          })();
        }}
      />
    </>
  );
}

function confirmTitle(confirm: ConfirmState): string {
  if (confirm?.type === 'delete-permission') return 'Delete permission?';
  if (confirm?.type === 'delete-module') return 'Delete module?';
  if (confirm?.type === 'deactivate-module') return confirm.module.isActive ? 'Deactivate module?' : 'Activate module?';
  if (confirm?.type === 'remove-all') return 'Remove all permissions?';
  if (confirm?.type === 'clear-module') return 'Clear module permissions?';
  return 'Confirm';
}

function confirmMessage(confirm: ConfirmState): string {
  if (confirm?.type === 'delete-permission') {
    const label = permissionDisplayName(confirm.permission);
    if (confirm.roleCount === 0) return `Delete "${label}"? It is not assigned to any role.`;
    return `Delete "${label}"? It is assigned to ${confirm.roleCount} role${confirm.roleCount === 1 ? '' : 's'} and will be removed from those assignments.`;
  }
  if (confirm?.type === 'delete-module') {
    return `Delete "${confirm.module.name}"? Child modules and permission links for this module will also be removed.`;
  }
  if (confirm?.type === 'deactivate-module') {
    return confirm.module.isActive
      ? `Deactivate "${confirm.module.name}"? It will remain in the catalog but marked inactive.`
      : `Activate "${confirm.module.name}"?`;
  }
  if (confirm?.type === 'remove-all') {
    return 'This removes every permission from the current role. Permission definitions are not deleted.';
  }
  if (confirm?.type === 'clear-module') {
    return `Remove all "${confirm.module.name}" permissions from this role?`;
  }
  return '';
}

function confirmConfirmLabel(confirm: ConfirmState): string {
  if (confirm?.type === 'delete-permission' || confirm?.type === 'delete-module') return 'Delete';
  if (confirm?.type === 'remove-all' || confirm?.type === 'clear-module') return 'Remove';
  if (confirm?.type === 'deactivate-module') return confirm.module.isActive ? 'Deactivate' : 'Activate';
  return 'Confirm';
}

function RoleHeader({
  role,
  summary,
  saveState,
  onAddModule,
  onAddPermission,
  onAssignAll,
  onRemoveAll,
  onClose,
}: {
  role: Role;
  summary: WorkspaceSummary;
  saveState: SaveState;
  onAddModule: () => void;
  onAddPermission: () => void;
  onAssignAll: () => void;
  onRemoveAll: () => void;
  onClose?: () => void;
}): ReactNode {
  return (
    <div style={{
      padding: 'var(--maw-space-md) var(--maw-space-lg)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--maw-space-md)',
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>
          {role.name} Permissions
        </div>
        <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', marginTop: 2 }}>
          {role.code} · {summary.assignedPermissions}/{summary.availablePermissions} assigned
          {saveState !== 'idle' && (
            <>
              {' · '}
              <SaveStatus state={saveState} />
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="ghost" onClick={onAssignAll} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 10px' }}>Assign All</Button>
        <Button variant="ghost" onClick={onRemoveAll} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 10px' }}>Remove All</Button>
        <Button variant="ghost" onClick={onAddPermission} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 10px' }}>+ Permission</Button>
        <Button onClick={onAddModule} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 10px' }}>+ Module</Button>
        {onClose && <IconButton label="Close" onClick={onClose}>✕</IconButton>}
      </div>
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }): ReactNode {
  if (state === 'idle') return null;
  const text = state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Save failed';
  const color = state === 'error' ? 'var(--maw-danger)' : 'var(--maw-fgSubtle)';
  return (
    <span role="status" aria-live="polite" style={{ fontSize: 'var(--maw-text-xs)', color }}>
      {text}
    </span>
  );
}

function FilterRow({
  assignment,
  status,
  onAssignment,
  onStatus,
}: {
  assignment: AssignmentFilter;
  status: StatusFilter;
  onAssignment: (v: AssignmentFilter) => void;
  onStatus: (v: StatusFilter) => void;
}): ReactNode {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }} role="toolbar" aria-label="Module filters">
      {([
        ['all', 'All Modules'],
        ['assigned', 'Assigned'],
        ['partial', 'Partially Assigned'],
        ['none', 'No Access'],
      ] as const).map(([key, label]) => (
        <Button
          key={key}
          variant={assignment === key ? undefined : 'ghost'}
          aria-pressed={assignment === key}
          onClick={() => onAssignment(key)}
          style={{ fontSize: 'var(--maw-text-xs)', padding: '4px 10px' }}
        >
          {label}
        </Button>
      ))}
      <span aria-hidden="true" style={{ width: 1, background: 'var(--maw-border)', margin: '4px 4px' }} />
      {([
        ['all', 'All'],
        ['active', 'Active'],
        ['inactive', 'Inactive'],
      ] as const).map(([key, label]) => (
        <Button
          key={key}
          variant={status === key ? undefined : 'ghost'}
          aria-pressed={status === key}
          onClick={() => onStatus(key)}
          style={{ fontSize: 'var(--maw-text-xs)', padding: '4px 10px' }}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

function PermissionEditor({
  heading = 'Permissions',
  rows,
  emptyText = 'No permissions yet. Add one below.',
  addValue,
  onAddValueChange,
  onAdd,
  adding = false,
}: {
  heading?: string;
  rows: readonly {
    key: string;
    label: string;
    title?: string;
    assigned?: boolean;
    showAssign?: boolean;
    onToggleAssign?: (assigned: boolean) => void;
    canDelete: boolean;
    deleteDisabledReason?: string;
    onDelete?: () => void;
  }[];
  emptyText?: string;
  addValue: string;
  onAddValueChange: (value: string) => void;
  onAdd: () => void;
  adding?: boolean;
}): ReactNode {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)', marginBottom: 8 }}>
        {heading}
      </div>
      {rows.length === 0 ? (
        <div style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)', marginBottom: 12 }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          {rows.map((row) => (
            <div
              key={row.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 4px',
                borderBottom: '1px solid var(--maw-border)',
              }}
            >
              <label
                title={row.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                  cursor: row.showAssign ? 'pointer' : 'default',
                }}
              >
                {row.showAssign && (
                  <input
                    type="checkbox"
                    checked={row.assigned === true}
                    onChange={(e) => row.onToggleAssign?.(e.target.checked)}
                    aria-label={row.label}
                    style={{ width: 14, height: 14, accentColor: 'var(--maw-brand)', cursor: 'pointer', margin: 0, flexShrink: 0 }}
                  />
                )}
                <span style={{
                  fontSize: 'var(--maw-text-sm)',
                  fontWeight: 500,
                  color: row.showAssign && !row.assigned ? 'var(--maw-fgMuted)' : 'var(--maw-fg)',
                }}>
                  {row.label}
                </span>
              </label>
              {row.canDelete ? (
                <IconButton
                  label={`Delete ${row.label}`}
                  onClick={row.onDelete}
                  style={{ width: 28, height: 28, fontSize: 16, color: 'var(--maw-danger)' }}
                >
                  ×
                </IconButton>
              ) : row.deleteDisabledReason ? (
                <Tooltip content={row.deleteDisabledReason}>
                  <IconButton label="Delete" disabled style={{ width: 28, height: 28, fontSize: 16, opacity: 0.35 }}>×</IconButton>
                </Tooltip>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <Divider style={{ margin: '16px 0' }} />
      <div style={{ fontWeight: 600, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)', marginBottom: 8 }}>
        Add permission
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TextField
            placeholder="e.g. Approve"
            value={addValue}
            onChange={(e) => onAddValueChange((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
              }
            }}
            style={{ height: 40, boxSizing: 'border-box' }}
          />
        </div>
        <Button
          onClick={onAdd}
          loading={adding}
          disabled={adding || addValue.trim() === ''}
          style={{
            flexShrink: 0,
            height: 40,
            padding: '0 16px',
            fontSize: 'var(--maw-text-sm)',
            boxSizing: 'border-box',
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function ManagePermissionsDrawer({
  module,
  onClose,
  onTogglePermission,
  onAdded,
  onDelete,
}: {
  module: WorkspaceModule | null;
  onClose: () => void;
  onTogglePermission: (permissionId: number, assigned: boolean) => void;
  onAdded: () => Promise<void>;
  onDelete: (permission: WorkspacePermission) => void;
}): ReactNode {
  const toast = useToast();
  const [newPermissionName, setNewPermissionName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!module) {
      setNewPermissionName('');
      setAdding(false);
    }
  }, [module]);

  const addTypedPermission = async () => {
    if (!module) return;
    const name = newPermissionName.trim();
    if (!name || adding) return;
    const key = actionCodeFromName(name);
    const exists = module.permissions.some((p) => (
      p.name.toLowerCase() === key.toLowerCase()
      || p.name.toLowerCase() === name.toLowerCase()
      || p.code.toLowerCase().startsWith(`${key.toLowerCase()}|`)
      || p.code.toLowerCase().startsWith(`${key.toLowerCase()}_`)
    ));
    if (exists) {
      toast.error('Permission already exists on this module.');
      return;
    }
    setAdding(true);
    try {
      await addPermissionToModule(module.id, {
        code: suggestPermissionCode(name, module.name),
        name: key,
      });
      toast.success('Permission added');
      setNewPermissionName('');
      await onAdded();
    } catch (e) {
      toast.error(rbacErrorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const assigned = module?.assignedCount ?? 0;
  const total = module?.permissionCount ?? 0;

  return (
    <Drawer
      open={module !== null}
      onClose={onClose}
      title="Manage Permissions"
      footer={<Button variant="ghost" onClick={onClose}>Done</Button>}
    >
      {module && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>{module.name}</div>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', marginTop: 2 }}>
              {assigned}/{total} assigned to this role
            </div>
          </div>
          <PermissionEditor
            heading="Permissions"
            rows={module.permissions.map((p) => ({
              key: String(p.id),
              label: permissionDisplayName(p),
              title: p.code,
              showAssign: true,
              assigned: p.assigned,
              onToggleAssign: (checked) => onTogglePermission(p.id, checked),
              canDelete: !p.isSystem,
              deleteDisabledReason: 'System permissions cannot be deleted.',
              onDelete: () => onDelete(p),
            }))}
            addValue={newPermissionName}
            onAddValueChange={setNewPermissionName}
            onAdd={() => { void addTypedPermission(); }}
            adding={adding}
          />
        </div>
      )}
    </Drawer>
  );
}

function ModuleDrawer({
  state,
  modules,
  onClose,
  onCreated,
  onUpdated,
  onPermissionsChanged,
  onDeletePermission,
}: {
  state: Extract<DrawerState, { type: 'module' }> | null;
  modules: readonly WorkspaceModule[];
  onClose: () => void;
  onCreated: (moduleId: number) => Promise<void>;
  onUpdated: () => Promise<void>;
  onPermissionsChanged: () => Promise<void>;
  onDeletePermission: (permission: WorkspacePermission) => void;
}): ReactNode {
  const toast = useToast();
  const [codeTouched, setCodeTouched] = useState(false);
  const [extraPermissions, setExtraPermissions] = useState<{ key: string; name: string }[]>(defaultNewModulePermissions);
  const [newPermissionName, setNewPermissionName] = useState('');
  const [adding, setAdding] = useState(false);
  const isEdit = state?.mode === 'edit';
  const editingModule = state?.mode === 'edit'
    ? modules.find((m) => m.id === state.module.id) ?? state.module
    : null;

  const form = useForm({
    initialValues: { code: '', name: '', sortOrder: 0, isActive: true },
    fields: { name: { required: true }, code: { required: true } },
    onSubmit: async (values) => {
      try {
        const extraPayload = extraPermissions.map((perm) => ({
          code: joinPermissionCode(perm.key, pascalToken(values.name)),
          name: perm.key,
        }));
        if (isEdit && state.mode === 'edit') {
          await updateModule(state.module.id, {
            name: values.name,
            description: state.module.description ?? undefined,
            sortOrder: Number(values.sortOrder),
            isActive: values.isActive,
            parentModuleId: state.module.parentModuleId,
          });
          toast.success('Module updated');
          await onUpdated();
        } else {
          const created = await createModule({
            code: values.code.trim(),
            name: values.name.trim(),
            sortOrder: Number(values.sortOrder),
            permissions: extraPayload,
          });
          toast.success('Module created');
          await onCreated(created.id);
        }
      } catch (e) {
        toast.error(rbacErrorMessage(e));
      }
    },
  });

  useEffect(() => {
    if (!state) return;
    setCodeTouched(false);
    setExtraPermissions([]);
    setNewPermissionName('');
    setAdding(false);
    if (state.mode === 'edit') {
      form.reset({
        code: state.module.code,
        name: state.module.name,
        sortOrder: state.module.sortOrder,
        isActive: state.module.isActive,
      });
    } else {
      setExtraPermissions(defaultNewModulePermissions);
      form.reset({ code: '', name: '', sortOrder: 0, isActive: true });
    }
  }, [state]);

  const addTypedPermission = async () => {
    const name = newPermissionName.trim();
    if (!name || adding) return;
    const key = actionCodeFromName(name);
    const defaultAction = DEFAULT_MODULE_ACTIONS.find(
      (a) => a.key.toLowerCase() === key.toLowerCase() || a.label.toLowerCase() === name.toLowerCase(),
    );

    if (isEdit && editingModule) {
      const exists = editingModule.permissions.some((p) => (
        p.name.toLowerCase() === key.toLowerCase()
        || p.name.toLowerCase() === name.toLowerCase()
        || p.code.toLowerCase().startsWith(`${key.toLowerCase()}|`)
        || p.code.toLowerCase().startsWith(`${key.toLowerCase()}_`)
      ));
      if (exists) {
        toast.error('Permission already exists on this module.');
        return;
      }
      setAdding(true);
      try {
        await addPermissionToModule(editingModule.id, {
          code: suggestPermissionCode(name, editingModule.name),
          name: defaultAction?.key ?? key,
        });
        toast.success('Permission added');
        setNewPermissionName('');
        await onPermissionsChanged();
      } catch (e) {
        toast.error(rbacErrorMessage(e));
      } finally {
        setAdding(false);
      }
      return;
    }

    if (defaultAction) {
      if (extraPermissions.some((p) => p.key === defaultAction.key)) {
        toast.error('Permission already added.');
        return;
      }
      setExtraPermissions((prev) => [...prev, { key: defaultAction.key, name: defaultAction.label }]);
      setNewPermissionName('');
      return;
    }
    if (extraPermissions.some((p) => p.key.toLowerCase() === key.toLowerCase())) {
      toast.error('Permission already added.');
      return;
    }
    setExtraPermissions((prev) => [...prev, { key, name }]);
    setNewPermissionName('');
  };

  const permissionRows = isEdit && editingModule
    ? editingModule.permissions.map((p) => ({
        key: String(p.id),
        label: permissionDisplayName(p),
        title: p.code,
        canDelete: !p.isSystem,
        deleteDisabledReason: 'System permissions cannot be deleted.',
        onDelete: () => onDeletePermission(p),
      }))
    : extraPermissions.map((perm) => ({
        key: `extra-${perm.key}`,
        label: perm.name,
        canDelete: true,
        onDelete: () => setExtraPermissions((prev) => prev.filter((p) => p.key !== perm.key)),
      }));

  return (
    <Drawer
      open={state !== null}
      onClose={onClose}
      title={isEdit ? `Edit Module: ${state?.mode === 'edit' ? state.module.code : ''}` : 'Add Module'}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => form.handleSubmit()} loading={form.submitting} disabled={form.submitting}>
            {isEdit ? 'Save Changes' : 'Create Module'}
          </Button>
        </>
      )}
    >
      <TextField
        label="Module Name"
        required
        error={form.errors.name}
        value={form.values.name}
        onChange={(e) => {
          const name = (e.target as HTMLInputElement).value;
          form.setValue('name', name);
          if (!isEdit && !codeTouched) form.setValue('code', suggestModuleCode(name));
        }}
        placeholder="e.g. Customers"
      />
      <TextField
        label="Module Code"
        required
        error={form.errors.code}
        value={form.values.code}
        disabled={isEdit}
        onChange={(e) => {
          setCodeTouched(true);
          form.setValue('code', (e.target as HTMLInputElement).value);
        }}
        placeholder="e.g. customers"
      />
      <TextField
        label="Sort Order"
        type="number"
        value={String(form.values.sortOrder)}
        onChange={(e) => form.setValue('sortOrder', Number((e.target as HTMLInputElement).value))}
      />
      {isEdit && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--maw-text-sm)', marginBottom: 12 }}>
          <input type="checkbox" checked={form.values.isActive} onChange={(e) => form.setValue('isActive', e.target.checked)} />
          Active
        </label>
      )}
      <PermissionEditor
        rows={permissionRows}
        addValue={newPermissionName}
        onAddValueChange={setNewPermissionName}
        onAdd={() => { void addTypedPermission(); }}
        adding={adding}
      />
    </Drawer>
  );
}

function PermissionDrawer({
  state,
  modules,
  onClose,
  onCreated,
  onUpdated,
}: {
  state: Extract<DrawerState, { type: 'permission' }> | null;
  modules: readonly WorkspaceModule[];
  onClose: () => void;
  onCreated: (moduleId: number) => Promise<void>;
  onUpdated: (moduleId: number) => Promise<void>;
}): ReactNode {
  const toast = useToast();
  const [moduleId, setModuleId] = useState<number | ''>('');
  const [moduleError, setModuleError] = useState<string>();
  const isEdit = state?.mode === 'edit';
  const selectedModule = modules.find((m) => m.id === (typeof moduleId === 'number' ? moduleId : -1));

  const form = useForm({
    initialValues: { name: '', isActive: true },
    fields: { name: { required: true } },
    onSubmit: async (values) => {
      try {
        const name = values.name.trim();
        if (isEdit && state?.mode === 'edit') {
          await updatePermission(state.permission.id, {
            name: actionCodeFromName(name),
            description: state.permission.description ?? undefined,
            isActive: values.isActive,
            sortOrder: state.permission.sortOrder,
          });
          toast.success('Permission updated');
          await onUpdated(state.moduleId);
          return;
        }
        if (typeof moduleId !== 'number' || !selectedModule) {
          setModuleError('Select a module');
          return;
        }
        const key = actionCodeFromName(name);
        const exists = selectedModule.permissions.some((p) => (
          p.name.toLowerCase() === key.toLowerCase()
          || p.name.toLowerCase() === name.toLowerCase()
          || p.code.toLowerCase().startsWith(`${key.toLowerCase()}|`)
          || p.code.toLowerCase().startsWith(`${key.toLowerCase()}_`)
        ));
        if (exists) {
          toast.error('Permission already exists on this module.');
          return;
        }
        await addPermissionToModule(moduleId, {
          code: suggestPermissionCode(name, selectedModule.name),
          name: key,
        });
        toast.success('Permission added');
        await onCreated(moduleId);
      } catch (e) {
        toast.error(rbacErrorMessage(e));
      }
    },
  });

  useEffect(() => {
    if (!state) return;
    setModuleError(undefined);
    if (state.mode === 'edit') {
      setModuleId(state.moduleId);
      form.reset({
        name: state.permission.name,
        isActive: state.permission.isActive,
      });
    } else {
      setModuleId(state.moduleId ?? '');
      form.reset({ name: '', isActive: true });
    }
  }, [state]);

  return (
    <Drawer
      open={state !== null}
      onClose={onClose}
      title={isEdit ? 'Edit Permission' : 'Add Permission'}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => form.handleSubmit()} loading={form.submitting} disabled={form.submitting}>
            {isEdit ? 'Save Changes' : 'Add Permission'}
          </Button>
        </>
      )}
    >
      {!isEdit && (
        <Select
          label="Module"
          placeholder="Select a module"
          error={moduleError}
          value={moduleId === '' ? '' : String(moduleId)}
          options={modules.map((m) => ({ value: String(m.id), label: m.name }))}
          onChange={(e) => {
            const raw = (e.target as HTMLSelectElement).value;
            setModuleId(raw === '' ? '' : Number(raw));
            setModuleError(undefined);
          }}
        />
      )}
      <TextField
        label="Permission Name"
        error={form.errors.name}
        value={form.values.name}
        onChange={(e) => form.setValue('name', (e.target as HTMLInputElement).value)}
        placeholder="e.g. Export"
      />
      {isEdit && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--maw-text-sm)' }}>
          <input type="checkbox" checked={form.values.isActive} onChange={(e) => form.setValue('isActive', e.target.checked)} />
          Active
        </label>
      )}
    </Drawer>
  );
}
