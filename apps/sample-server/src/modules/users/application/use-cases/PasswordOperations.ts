import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';

export type HashPasswordFn = (plainPassword: string) => Promise<string>;

/**
 * Admin-initiated password reset: sets a user's password directly, bypassing
 * current-password verification. This is for an administrator unblocking a
 * locked-out user, not self-service password change.
 *
 * For self-service "change my password" (which verifies the current password)
 * or the forgot-password email flow, use `@mawsoftwares/auth-core`'s
 * `PasswordChangeService` / `PasswordResetService` directly via the `/auth`
 * routes — this use-case only covers the admin path.
 */
export class AdminResetPasswordUseCase {
  constructor(
    private readonly repo: IUsersRepository,
    private readonly hashPassword: HashPasswordFn,
  ) {}

  async execute(tenantId: string, userId: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error('newPassword must be at least 8 characters');
    }
    const passwordHash = await this.hashPassword(newPassword);
    const updated = await this.repo.updateUser(userId, tenantId, { passwordHash });
    if (!updated) {
      throw new Error('User not found');
    }
  }
}
