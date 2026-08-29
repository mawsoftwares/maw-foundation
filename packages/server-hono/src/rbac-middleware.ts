import type { MiddlewareHandler, Context } from 'hono';
import type { AuthClaims } from '@mawsoftwares/auth-core';
import { checkPermissionDynamic, type MasterCache } from '@mawsoftwares/rbac-core';
import { HttpStatus } from '@mawsoftwares/sdk';

export interface HonoDynamicAuthOptions {
  readonly jwtSecret: string;
  readonly cache: MasterCache;
  readonly superuserRoles?: readonly string[];
  readonly loadUserContext?: (claims: AuthClaims) => Promise<{ roleId?: number; permissions?: string[] }>;
}

export function createHonoDynamicPermission(
  options: HonoDynamicAuthOptions,
): (permission: string) => MiddlewareHandler {
  return (permission: string): MiddlewareHandler =>
    async (c: Context, next) => {
      const claims = c.get('mawClaims') as AuthClaims | undefined;
      if (!claims) {
        return c.json({ error: 'not authenticated' }, HttpStatus.UNAUTHORIZED as 401);
      }

      if (options.superuserRoles?.includes(claims.role)) {
        await next();
        return;
      }

      let roleId: number | undefined;
      let permissions: string[] | undefined;

      if (options.loadUserContext) {
        const ctx = await options.loadUserContext(claims);
        roleId = ctx.roleId;
        permissions = ctx.permissions;
      }

      const result = await checkPermissionDynamic(
        { userId: claims.userId, roleId, permissions },
        permission,
        options.cache,
      );

      if (result.granted) {
        await next();
        return;
      }

      return c.json(
        { error: 'forbidden', permission, reason: result.reason },
        HttpStatus.FORBIDDEN as 403,
      );
    };
}
