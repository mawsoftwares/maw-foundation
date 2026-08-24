export const UserRole = {
  owner: 'owner',
  super_admin: 'super_admin',
  admin: 'admin',
  manager: 'manager',
  cashier: 'cashier',
  viewer: 'viewer',
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  readonly email: string;
  readonly role?: UserRoleValue;
  readonly name?: string;
  readonly tenantId?: string;
  readonly createdAt?: string;
}
