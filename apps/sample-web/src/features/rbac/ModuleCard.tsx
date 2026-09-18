import { useEffect, useRef, type ReactNode } from 'react';
import {
  Badge, Divider, DropdownMenu, IconButton,
} from '@mawsoftwares/ui-web';
import type { WorkspaceModule } from './types';
import { moduleCheckboxState, permissionDisplayName } from './workspace-model';

function TriCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}): ReactNode {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      aria-checked={indeterminate ? 'mixed' : checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 14, height: 14, accentColor: 'var(--maw-brand)', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0, margin: 0 }}
    />
  );
}

export function ModuleCard({
  module,
  expanded,
  showDivider,
  onToggleExpanded,
  onTogglePermission,
  onToggleAll,
  onEditModule,
  onDeactivateModule,
  onDeleteModule,
  onManagePermissions,
}: {
  module: WorkspaceModule;
  expanded: boolean;
  showDivider: boolean;
  onToggleExpanded: () => void;
  onTogglePermission: (permissionId: number, assigned: boolean) => void;
  onToggleAll: (assign: boolean) => void;
  onEditModule: () => void;
  onDeactivateModule: () => void;
  onDeleteModule: () => void;
  onManagePermissions: () => void;
}): ReactNode {
  const state = moduleCheckboxState(module);
  const indent = module.parentModuleId ? 16 : 0;
  const canManage = !module.isVirtual;

  return (
    <section
      id={`rbac-module-${module.id}`}
      aria-labelledby={`rbac-module-title-${module.id}`}
      style={{ marginLeft: indent, scrollMarginTop: 12 }}
    >
      {showDivider && <Divider style={{ margin: 'var(--maw-space-xs) 0' }} />}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--maw-space-sm)',
        padding: 'var(--maw-space-sm) 0',
      }}>
        <TriCheckbox
          checked={state === 'checked'}
          indeterminate={state === 'indeterminate'}
          disabled={module.permissionCount === 0}
          label={`Assign all ${module.name} permissions`}
          onChange={(checked) => onToggleAll(checked)}
        />
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--maw-space-sm)',
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <h3
            id={`rbac-module-title-${module.id}`}
            style={{ margin: 0, fontWeight: 500, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}
          >
            {module.name}
          </h3>
          {!module.isVirtual && !module.isActive && <Badge variant="danger">Inactive</Badge>}
          <span style={{
            marginLeft: 'auto',
            fontSize: 'var(--maw-text-xs)',
            color: 'var(--maw-fgSubtle)',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {module.assignedCount}/{module.permissionCount}
          </span>
          <span aria-hidden="true" style={{
            fontSize: 10,
            color: 'var(--maw-fgSubtle)',
            transform: `rotate(${expanded ? 180 : 0}deg)`,
            display: 'inline-block',
          }}>▾</span>
        </button>
        {canManage && (
          <DropdownMenu
            trigger={<IconButton label={`Manage ${module.name}`} style={{ width: 28, height: 28 }}>⋮</IconButton>}
            items={[
              { key: 'manage', label: 'Manage Permissions', onClick: onManagePermissions },
              { key: 'edit', label: 'Edit Module', onClick: onEditModule },
              {
                key: 'deactivate',
                label: module.isActive ? 'Deactivate Module' : 'Activate Module',
                onClick: onDeactivateModule,
              },
              ...(module.isSystem
                ? [{
                    key: 'delete',
                    label: 'Delete Module',
                    danger: true,
                    disabled: true,
                    disabledReason: 'System modules cannot be deleted',
                    onClick: () => undefined,
                  }]
                : [{ key: 'delete', label: 'Delete Module', danger: true, onClick: onDeleteModule }]),
            ]}
          />
        )}
      </div>

      {expanded && (
        <div style={{ padding: '0 0 var(--maw-space-sm) 22px' }}>
          {module.permissions.length === 0 ? (
            <div style={{ padding: '4px 0', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
              No permissions.
            </div>
          ) : (
            <div
              role="group"
              aria-label={`${module.name} permissions`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '2px var(--maw-space-md)',
              }}
            >
              {module.permissions.map((p) => {
                const label = permissionDisplayName(p);
                return (
                  <label
                    key={p.id}
                    title={p.code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 0,
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: 'var(--maw-radius-sm)',
                      background: p.assigned
                        ? 'color-mix(in srgb, var(--maw-brand) 7%, transparent)'
                        : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={p.assigned}
                      onChange={(e) => onTogglePermission(p.id, e.target.checked)}
                      aria-label={`Assign ${label} (${p.code}) to this role`}
                      style={{ width: 13, height: 14, accentColor: 'var(--maw-brand)', cursor: 'pointer', flexShrink: 0, margin: 0 }}
                    />
                    <span style={{
                      fontSize: 'var(--maw-text-sm)',
                      fontWeight: 500,
                      color: p.assigned ? 'var(--maw-fg)' : 'var(--maw-fgMuted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
