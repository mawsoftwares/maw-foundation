export interface SecurityContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly sessionId?: string;
  readonly authenticationMethod?: 'password' | 'token' | 'sso' | 'api-key';
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export function createSecurityContext(
  claims: { readonly userId: string; readonly tenantId: string; readonly role: string },
  extras?: {
    readonly permissions?: readonly string[];
    readonly sessionId?: string;
    readonly authenticationMethod?: SecurityContext['authenticationMethod'];
    readonly ipAddress?: string;
    readonly userAgent?: string;
  },
): SecurityContext {
  return {
    userId: claims.userId,
    tenantId: claims.tenantId,
    roles: [claims.role],
    permissions: extras?.permissions ?? [],
    sessionId: extras?.sessionId,
    authenticationMethod: extras?.authenticationMethod ?? 'token',
    ipAddress: extras?.ipAddress,
    userAgent: extras?.userAgent,
  };
}
