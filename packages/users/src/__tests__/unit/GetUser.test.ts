import { describe, it, expect, vi } from 'vitest';
import { GetUserUseCase } from '../../application/use-cases/GetUser';
import { AccountStatus } from '@maw/sdk/security/AccountStatus';

describe('GetUserUseCase', () => {
  it('should return a user', async () => {
    const mockUser = {
      id: 'user-1',
      tenantId: 'tenant-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      status: AccountStatus.ACTIVE,
      deletedAt: null,
    };

    const mockRepo: unknown = {
      findById: vi.fn().mockResolvedValue(mockUser),
    };

    const useCase = new GetUserUseCase(mockRepo);

    const result = await useCase.execute('user-1', 'tenant-1');
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('john@example.com');
  });

  it('should throw if user not found', async () => {
    const mockRepo: unknown = {
      findById: vi.fn().mockResolvedValue(null),
    };
    const useCase = new GetUserUseCase(mockRepo);
    await expect(useCase.execute('user-1', 'tenant-1')).rejects.toThrow('USER_NOT_FOUND');
  });

  it('should throw if user is soft deleted', async () => {
    const mockUser = {
      id: 'user-1',
      tenantId: 'tenant-1',
      deletedAt: new Date().toISOString(),
    };
    const mockRepo: unknown = {
      findById: vi.fn().mockResolvedValue(mockUser),
    };
    const useCase = new GetUserUseCase(mockRepo);
    await expect(useCase.execute('user-1', 'tenant-1')).rejects.toThrow('USER_NOT_FOUND');
  });
});
