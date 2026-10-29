/**
 * Layout permissions, `Action_Module` per the RBAC convention. Registered by the host server (see the layout
 * module definition in apps/sample-server). The UI gates on `can()` from /me; the server enforces the same codes.
 *
 * - Read_Layout    open Layout Studio and read draft/history
 * - Update_Layout  edit and save the DRAFT; preview never touches what users see
 * - Publish_Layout make a draft the live layout, and roll back
 */
export const LAYOUT_PERMISSIONS = {
  read: 'Read_Layout',
  update: 'Update_Layout',
  publish: 'Publish_Layout',
} as const;
