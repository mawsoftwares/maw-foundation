import { hashPassword } from '@mawsoftwares/auth-core';
import { randomUUID } from 'crypto';
import { AccountStatus } from '@mawsoftwares/sdk/security/AccountStatus';
import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import type { CreateUserDto, UserResponseDto } from '../dto';
import { toUserResponseDto } from './index';

/**
 * Users Module Template — CreateUser use case.
 *
 * This is where project-specific creation logic lives.
 * Add your own validation, duplicate checks, default assignments, events.
 *
 * Uses @mawsoftwares/auth-core for password hashing (Foundation dependency).
 */
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUsersRepository,
    private readonly auditService?: { log: (event: string, data: Record<string, unknown>) => void },
    private readonly eventBus?: { emit: (name: string, payload: Record<string, unknown>) => void },
  ) {}

  async execute(input: CreateUserDto, actorId?: string): Promise<UserResponseDto> {
    // ── Validation ────────────────────────────────────────────────────────
    if (!input.firstName?.trim()) throw new Error('USER_FIRST_NAME_REQUIRED');
    if (!input.lastName?.trim())  throw new Error('USER_LAST_NAME_REQUIRED');
    if (!input.email?.trim())     throw new Error('USER_EMAIL_REQUIRED');

    const email = input.email.trim().toLowerCase();

    // ── Uniqueness checks ─────────────────────────────────────────────────
    const emailExists = await this.userRepository.existsByEmail(input.tenantId, email);
    if (emailExists) throw new Error('USER_EMAIL_ALREADY_EXISTS');

    if (input.phone) {
      const phoneExists = await this.userRepository.existsByPhone(input.tenantId, input.phone);
      if (phoneExists) throw new Error('USER_PHONE_ALREADY_EXISTS');
    }

    // ── Hash password via @mawsoftwares/auth-core ─────────────────────────
    const passwordHash = input.password ? await hashPassword(input.password) : '';

    // ── Persist ───────────────────────────────────────────────────────────
    const id   = randomUUID();
    const role = input.role?.trim() ?? 'viewer';

    const user = await this.userRepository.create({
      id,
      tenantId:  input.tenantId,
      firstName: input.firstName.trim(),
      lastName:  input.lastName.trim(),
      email,
      phone:        input.phone,
      passwordHash,
      avatar:       input.avatar,
      role,
      status:    AccountStatus.ACTIVE,
      createdBy: actorId,
      deletedAt: null,
    });

    // ── Side-effects ──────────────────────────────────────────────────────
    this.auditService?.log('USER_CREATED', {
      actor: actorId, target: user.id,
      metadata: { email: user.email, role },
    });

    this.eventBus?.emit('UserCreated', {
      type: 'USER_CREATED', userId: user.id,
      tenantId: user.tenantId, actorId,
      timestamp: new Date().toISOString(),
    });

    return toUserResponseDto(user);
  }
}
