import { describe, it, expect, vi } from 'vitest';
import { CreateUserUseCase } from '../../application/use-cases/CreateUser';
import { CreateUserDto } from '../../application/dto';
import { AccountStatus } from '@mawsoftwares/sdk/security/AccountStatus';

vi.mock('@mawsoftwares/auth-core', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
}));

describe('CreateUserUseCase', () => {
  it('should successfully create a user', async () => {
    const mockRepo: unknown = {
      existsByEmail: vi.fn().mockResolvedValue(false),
      existsByPhone: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockImplementation(async (data) => ({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    };

    const useCase = new CreateUserUseCase(mockRepo);

    const input: CreateUserDto = {
      tenantId: 'tenant-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      password: 'password123',
    };

    const result = await useCase.execute(input);

    expect(result.email).toBe('john@example.com');
    expect(result.firstName).toBe('John');
    expect(result.status).toBe(AccountStatus.ACTIVE);
    expect(mockRepo.create).toHaveBeenCalledOnce();
  });

  it('should throw on duplicate email', async () => {
    const mockRepo: unknown = {
      existsByEmail: vi.fn().mockResolvedValue(true),
    };

    const useCase = new CreateUserUseCase(mockRepo);

    const input: CreateUserDto = {
      tenantId: 'tenant-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    await expect(useCase.execute(input)).rejects.toThrow('USER_EMAIL_ALREADY_EXISTS');
  });

  it('should throw on duplicate phone', async () => {
    const mockRepo: unknown = {
      existsByEmail: vi.fn().mockResolvedValue(false),
      existsByPhone: vi.fn().mockResolvedValue(true),
    };

    const useCase = new CreateUserUseCase(mockRepo);

    const input: CreateUserDto = {
      tenantId: 'tenant-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      password: 'password123',
    };

    await expect(useCase.execute(input)).rejects.toThrow('USER_PHONE_ALREADY_EXISTS');
  });
});
