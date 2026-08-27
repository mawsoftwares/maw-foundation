import { hashPassword } from '@mawsoftwares/auth-core';
import { validateFields } from '@mawsoftwares/sdk/kernel/validate';
import { randomUUID } from 'crypto';
import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';
import { CreateUserDto, CreateUserSchema, UserResponseDto } from '../dto';
import { AccountStatus } from '@mawsoftwares/sdk/security/AccountStatus';

// Basic mapping function
export function toUserResponseDto(user: unknown): UserResponseDto {
  const u = user as {
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    role?: string;
    status: string;
    emailVerifiedAt?: string;
    phoneVerifiedAt?: string;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  return {
    id: u.id,
    tenantId: u.tenantId,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    avatar: u.avatar,
    role: u.role,
    status: u.status as UserResponseDto['status'],
    emailVerifiedAt: u.emailVerifiedAt,
    phoneVerifiedAt: u.phoneVerifiedAt,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}


export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUsersRepository,
    private readonly rbacService?: unknown,
    private readonly auditService?: unknown,
    private readonly eventBus?: unknown,
  ) {}

  async execute(input: CreateUserDto, actorId?: string): Promise<UserResponseDto> {
    const errors = validateFields(input as unknown as Record<string, unknown>, CreateUserSchema as never);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }

    const email = input.email.trim().toLowerCase();

    const emailExists = await this.userRepository.existsByEmail(input.tenantId, email);
    if (emailExists) {
      throw new Error('USER_EMAIL_ALREADY_EXISTS');
    }

    if (input.phone) {
      const phoneExists = await this.userRepository.existsByPhone(input.tenantId, input.phone);
      if (phoneExists) {
        throw new Error('USER_PHONE_ALREADY_EXISTS');
      }
    }

    const passwordHash = input.password ? await hashPassword(input.password) : '';
    const id = randomUUID();
    const now = new Date().toISOString();
    const role = input.role?.trim() || 'viewer';

    const user = await this.userRepository.create({
      id,
      tenantId: input.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone,
      passwordHash,
      avatar: input.avatar,
      role,
      status: AccountStatus.ACTIVE,
      createdBy: actorId,
      deletedAt: null,
    });

    if (input.roleId && this.rbacService) {
      await (this.rbacService as { assignRole: (userId: string, roleId: string, tenantId: string) => Promise<void> })
        .assignRole(user.id, input.roleId, input.tenantId);
      if (this.auditService) {
        (this.auditService as { log: (event: string, data: Record<string, unknown>) => void })
          .log('ROLE_ASSIGNED', { actor: actorId, target: user.id, metadata: { roleId: input.roleId } });
      }
    }

    if (this.eventBus) {
      (this.eventBus as { emit: (name: string, payload: Record<string, unknown>) => void }).emit('UserCreated', {
        type: 'USER_CREATED',
        userId: user.id,
        tenantId: user.tenantId,
        actorId,
        timestamp: now,
      });
    }

    if (this.auditService) {
      (this.auditService as { log: (event: string, data: Record<string, unknown>) => void })
        .log('USER_CREATED', { actor: actorId, target: user.id, metadata: { email: user.email, role } });
    }

    return toUserResponseDto(user);
  }
}
