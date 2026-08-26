// Password operations use existing authentication/security abstraction
// and take the corresponding services as dependencies.
// Actually, as per the prompt: "Password operations must remain separate from CRUD. Implement: ChangePassword, ResetPassword. Use the existing authentication/security abstraction."
// I will create simple wrapper Use Cases that take PasswordChangeService and use it.

export class ChangePasswordUseCase {
  constructor(
    private readonly passwordChangeService: unknown, // PasswordChangeService from @maw/auth-core
    private readonly auditService?: any,
    private readonly eventBus?: any,
  ) {}

  async execute(tenantId: string, userId: string, newPassword: unknown, actorId?: string): Promise<void> {
    if (this.passwordChangeService) {
      await (this.passwordChangeService as any).changePassword({
        userId,
        newPassword,
        tenantId,
      });
    }

    if (this.eventBus) {
      this.eventBus.emit('PasswordChanged', {
        type: 'PASSWORD_CHANGED',
        userId,
        actorId,
        timestamp: new Date().toISOString(),
      });
    }

    if (this.auditService) {
      this.auditService.log('PASSWORD_CHANGED', { actor: actorId, target: userId });
    }
  }
}

export class ResetPasswordUseCase {
  constructor(
    private readonly passwordResetService: unknown, // PasswordResetService from @maw/auth-core
    private readonly auditService?: any,
    private readonly eventBus?: any,
  ) {}

  async execute(tenantId: string, email: string, newPassword: unknown, actorId?: string): Promise<void> {
    if (this.passwordResetService) {
      await (this.passwordResetService as any).resetPassword({
        email,
        newPassword,
        tenantId,
      });
    }

    if (this.eventBus) {
      this.eventBus.emit('PasswordReset', {
        type: 'PASSWORD_RESET',
        actorId,
        timestamp: new Date().toISOString(),
      });
    }

    if (this.auditService) {
      this.auditService.log('PASSWORD_RESET', { actor: actorId, target: email });
    }
  }
}
