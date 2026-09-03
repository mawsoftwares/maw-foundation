import { randomUUID } from 'node:crypto';
import type { IUserRepository } from '@mawsoftwares/sdk/contracts/IUserRepository';
import type { IHasher } from '@mawsoftwares/sdk/contracts/IHasher';
import type { SessionService } from './session-store';
import type { IOtpSecretStore } from './otp';
import { InvalidCredentialsError } from './auth-errors';

export interface AccountPurgeOptions {
  readonly userRepository: IUserRepository;
  readonly hasher: IHasher;
  readonly sessionService: SessionService;
  readonly otpSecretStore?: IOtpSecretStore;
}

export class AccountPurgeService {
  private readonly userRepository: IUserRepository;
  private readonly hasher: IHasher;
  private readonly sessionService: SessionService;
  private readonly otpSecretStore?: IOtpSecretStore;

  constructor(options: AccountPurgeOptions) {
    this.userRepository = options.userRepository;
    this.hasher = options.hasher;
    this.sessionService = options.sessionService;
    this.otpSecretStore = options.otpSecretStore;
  }

  async purge(userId: string, password: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new InvalidCredentialsError('User not found');

    const valid = await this.hasher.verify(password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError('Password is incorrect');

    await this.sessionService.revokeAll(user.tenantId, user.id);

    if (this.otpSecretStore) {
      await this.otpSecretStore.deleteAll(userId);
    }

    const purgedEmail = `deleted-${randomUUID()}@purged.local`;
    await this.userRepository.purgePersonalData(userId, purgedEmail);
  }
}
