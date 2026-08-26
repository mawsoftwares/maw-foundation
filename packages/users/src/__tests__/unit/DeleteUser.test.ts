import { describe, it, expect, vi } from 'vitest';
import { DeleteUserUseCase } from '../../application/use-cases/DeleteUser';

describe('DeleteUserUseCase', () => {
  it('should soft delete a user', async () => {
    const mockUser = {
      id: 'user-1',
      tenantId: 'tenant-1',
      deletedAt: null,
    };

    const mockRepo: unknown = {
      findById: vi.fn().mockResolvedValue(mockUser),
      softDelete: vi.fn().mockResolvedValue(true),
    };

    const mockEventBus = { emit: vi.fn() };
    const mockAudit = { log: vi.fn() };

    const useCase = new DeleteUserUseCase(mockRepo, mockAudit, mockEventBus);

    await useCase.execute('user-1', 'tenant-1', 'actor-1');

    expect(mockRepo.softDelete).toHaveBeenCalledWith('user-1', 'tenant-1');
    expect(mockEventBus.emit).toHaveBeenCalled();
    expect(mockAudit.log).toHaveBeenCalledWith('USER_DELETED', expect.any(Object));
  });

  it('should throw if user not found or already deleted', async () => {
    const mockRepo: unknown = {
      findById: vi.fn().mockResolvedValue(null),
    };
    const useCase = new DeleteUserUseCase(mockRepo);
    await expect(useCase.execute('user-1', 'tenant-1')).rejects.toThrow('USER_NOT_FOUND');
  });
});
