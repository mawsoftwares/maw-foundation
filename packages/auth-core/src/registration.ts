import { AccountStatus, type PasswordPolicyConfig, validatePassword, type RegistrationConfig } from '@maw/sdk';
import type { IUserRepository, UserRecord, CreateUserInput } from '@maw/sdk/contracts/IUserRepository';
import type { IHasher } from '@maw/sdk/contracts/IHasher';
import type { EmailVerification } from './email-verification';
import { DuplicateEmailError, PasswordPolicyError } from './auth-errors';

export interface RegistrationInput {
  readonly email: string;
  readonly password: string;
  readonly tenantId: string;
  readonly role?: string;
  readonly name?: string;
}

export type SendVerificationEmail = (email: string, token: string) => Promise<void>;

export interface RegistrationServiceOptions {
  readonly userRepository: IUserRepository;
  readonly hasher: IHasher;
  readonly passwordPolicy: PasswordPolicyConfig;
  readonly registrationConfig: RegistrationConfig;
  readonly emailVerification?: EmailVerification;
  readonly sendVerificationEmail?: SendVerificationEmail;
}

export class RegistrationService {
  private readonly userRepository: IUserRepository;
  private readonly hasher: IHasher;
  private readonly passwordPolicy: PasswordPolicyConfig;
  private readonly registrationConfig: RegistrationConfig;
  private readonly emailVerification?: EmailVerification;
  private readonly sendVerificationEmail?: SendVerificationEmail;

  constructor(options: RegistrationServiceOptions) {
    this.userRepository = options.userRepository;
    this.hasher = options.hasher;
    this.passwordPolicy = options.passwordPolicy;
    this.registrationConfig = options.registrationConfig;
    this.emailVerification = options.emailVerification;
    this.sendVerificationEmail = options.sendVerificationEmail;
  }

  async register(input: RegistrationInput): Promise<{ user: UserRecord; verificationToken?: string }> {
    const policyErrors = validatePassword(input.password, this.passwordPolicy);
    if (policyErrors.length > 0) {
      throw new PasswordPolicyError(policyErrors.map((e) => e.message));
    }

    const existing = await this.userRepository.findByEmail(input.tenantId, input.email);
    if (existing) {
      throw new DuplicateEmailError();
    }

    const passwordHash = await this.hasher.hash(input.password);
    const requireVerification = this.registrationConfig.requireEmailVerification;

    const createInput: CreateUserInput = {
      tenantId: input.tenantId,
      email: input.email,
      passwordHash,
      role: input.role ?? this.registrationConfig.defaultRole,
      name: input.name,
      accountStatus: requireVerification
        ? AccountStatus.PENDING_VERIFICATION
        : AccountStatus.ACTIVE,
    };

    const user = await this.userRepository.create(createInput);

    let verificationToken: string | undefined;
    if (requireVerification && this.emailVerification) {
      const { token } = await this.emailVerification.generate(user.id, user.email);
      verificationToken = token;

      if (this.sendVerificationEmail) {
        await this.sendVerificationEmail(user.email, token);
      }
    }

    return { user, verificationToken };
  }

  async verifyEmail(token: string): Promise<UserRecord> {
    if (!this.emailVerification) {
      throw new Error('Email verification is not configured');
    }
    const { userId } = await this.emailVerification.verify(token);
    await this.userRepository.updateStatus(userId, AccountStatus.ACTIVE);
    await this.userRepository.updateEmailVerified(userId, true);
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found after verification');
    return user;
  }
}
