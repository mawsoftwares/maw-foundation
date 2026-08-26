// Password operations use existing authentication/security abstraction
// and take the corresponding services as dependencies.
// Actually, as per the prompt: "Password operations must remain separate from CRUD. Implement: ChangePassword, ResetPassword. Use the existing authentication/security abstraction."
// I will create simple wrapper Use Cases that take PasswordChangeService and use it.

export class ChangePasswordUseCase {
  constructor(
    private readonly passwordChangeService: unknown, // PasswordChangeService from @maw/auth-core
    private readonly auditService?: unknown,
    private readonly eventBus?: unknown,
  ) {}

  async execute(userId: string, currentPasswordRaw: string, newPasswordRaw: string, actorId?: string): Promise<void> {
    // Assuming passwordChangeService.changePassword handles policy validation and hashing
    await this.passwordChangeService.changePassword({
      userId,
      currentPasswordRaw,
      newPasswordRaw,
    });

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
    private readonly auditService?: unknown,
    private readonly eventBus?: unknown,
  ) {}

  async execute(token: string, newPasswordRaw: string, actorId?: string): Promise<void> {
    // Assuming passwordResetService.completeReset handles token validation, policy validation, hashing
    const userId = await this.passwordResetService.completeReset(token, newPasswordRaw);

    if (this.eventBus) {
      this.eventBus.emit('PasswordReset', {
        type: 'PASSWORD_RESET',
        userId,
        actorId,
        timestamp: new Date().toISOString(),
      });
    }

    if (this.auditService) {
      this.auditService.log('PASSWORD_RESET', { actor: actorId, target: userId });
    }
  }
}
