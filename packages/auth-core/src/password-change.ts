import { type PasswordPolicyConfig, validatePassword } from '@mawsoftwares/sdk';
import type { IUserRepository } from '@mawsoftwares/sdk/contracts/IUserRepository';
import type { IHasher } from '@mawsoftwares/sdk/contracts/IHasher';
import { InvalidCredentialsError, PasswordPolicyError } from './auth-errors';

export interface PasswordChangeServiceOptions {
  readonly userRepository: IUserRepository;
  readonly hasher: IHasher;
  readonly passwordPolicy: PasswordPolicyConfig;
}

export class PasswordChangeService {
  private readonly userRepository: IUserRepository;
  private readonly hasher: IHasher;
  private readonly passwordPolicy: PasswordPolicyConfig;

  constructor(options: PasswordChangeServiceOptions) {
    this.userRepository = options.userRepository;
    this.hasher = options.hasher;
    this.passwordPolicy = options.passwordPolicy;
  }

  async change(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new InvalidCredentialsError('User not found');
    }

    const isValid = await this.hasher.verify(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError('Current password is incorrect');
    }

    const policyErrors = validatePassword(newPassword, this.passwordPolicy);
    if (policyErrors.length > 0) {
      throw new PasswordPolicyError(policyErrors.map((e) => e.message));
    }

    const passwordHash = await this.hasher.hash(newPassword);
    await this.userRepository.updatePassword(userId, passwordHash);
  }
}
