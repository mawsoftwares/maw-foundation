import { type PasswordPolicyConfig, validatePassword } from '@mawsoftwares/sdk';
import type { IUserRepository } from '@mawsoftwares/sdk/contracts/IUserRepository';
import type { IHasher } from '@mawsoftwares/sdk/contracts/IHasher';
import { InvalidCredentialsError, PasswordPolicyError } from './auth-errors';
import type { IPasswordHistoryStore } from './password-history';
import { isPasswordInHistory } from './password-history';

export interface PasswordChangeServiceOptions {
  readonly userRepository: IUserRepository;
  readonly hasher: IHasher;
  readonly passwordPolicy: PasswordPolicyConfig;
  readonly passwordHistoryStore?: IPasswordHistoryStore;
  readonly passwordHistoryCount?: number;
}

export class PasswordChangeService {
  private readonly userRepository: IUserRepository;
  private readonly hasher: IHasher;
  private readonly passwordPolicy: PasswordPolicyConfig;
  private readonly historyStore?: IPasswordHistoryStore;
  private readonly historyCount: number;

  constructor(options: PasswordChangeServiceOptions) {
    this.userRepository = options.userRepository;
    this.hasher = options.hasher;
    this.passwordPolicy = options.passwordPolicy;
    this.historyStore = options.passwordHistoryStore;
    this.historyCount = options.passwordHistoryCount ?? 5;
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

    if (this.historyStore) {
      const reused = await isPasswordInHistory(newPassword, userId, this.historyStore, this.hasher, this.historyCount);
      if (reused) {
        throw new PasswordPolicyError([`Password was used recently — choose a different one`]);
      }
    }

    const passwordHash = await this.hasher.hash(newPassword);
    await this.userRepository.updatePassword(userId, passwordHash);

    if (this.historyStore) {
      await this.historyStore.record(userId, user.passwordHash);
    }
  }
}
