import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MasterService } from '../services/master-service';
import type { IMasterRepository, IMasterFieldRepository, IMasterValueRepository } from '../types/ports';
import type { Master } from '../types/entities';
import { AppError } from '@maw/sdk/kernel/errors';

const mockMaster: Master = {
  id: 'uuid-1',
  tenantId: 'tenant-1',
  code: 'COLOR',
  name: 'Color',
  description: null,
  status: 'active',
  isSystem: false,
  allowCustomValues: true,
  config: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
  deletedAt: null,
  version: 1,
};

function createMockRepos() {
  const masterRepo: IMasterRepository = {
    findById: vi.fn(),
    findByCode: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };
  const fieldRepo: IMasterFieldRepository = {
    findById: vi.fn(),
    findByCode: vi.fn(),
    listByMaster: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };
  const valueRepo: IMasterValueRepository = {
    findById: vi.fn(),
    findByCode: vi.fn(),
    list: vi.fn(),
    options: vi.fn(),
    create: vi.fn(),
    createBulk: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    reorder: vi.fn(),
  };
  return { masterRepo, fieldRepo, valueRepo };
}

const ctx = { tenantId: 'tenant-1', userId: 'user-1' };

describe('MasterService', () => {
  let service: MasterService;
  let repos: ReturnType<typeof createMockRepos>;

  beforeEach(() => {
    repos = createMockRepos();
    const mockPool = { query: vi.fn(), connect: vi.fn() };
    service = new MasterService({
      pool: mockPool as never,
      masterRepo: repos.masterRepo,
      fieldRepo: repos.fieldRepo,
      valueRepo: repos.valueRepo,
    });
  });

  describe('createMaster', () => {
    it('validates and creates a master', async () => {
      vi.mocked(repos.masterRepo.findByCode).mockResolvedValue(null);
      vi.mocked(repos.masterRepo.create).mockResolvedValue(mockMaster);

      const result = await service.createMaster('tenant-1', { code: 'COLOR', name: 'Color' }, ctx);
      expect(result).toEqual(mockMaster);
      expect(repos.masterRepo.create).toHaveBeenCalledOnce();
    });

    it('throws on duplicate code', async () => {
      vi.mocked(repos.masterRepo.findByCode).mockResolvedValue(mockMaster);

      await expect(
        service.createMaster('tenant-1', { code: 'COLOR', name: 'Color' }, ctx),
      ).rejects.toThrow(AppError);
    });

    it('throws on invalid input', async () => {
      await expect(
        service.createMaster('tenant-1', { code: 'ab', name: 'Color' }, ctx),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('deleteMaster', () => {
    it('throws if master is system-protected', async () => {
      vi.mocked(repos.masterRepo.findById).mockResolvedValue({ ...mockMaster, isSystem: true });

      await expect(
        service.deleteMaster('tenant-1', 'uuid-1', ctx),
      ).rejects.toThrow('System master');
    });
  });

  describe('createField', () => {
    it('validates reference fields', async () => {
      vi.mocked(repos.masterRepo.findById).mockResolvedValue(mockMaster);

      await expect(
        service.createField('tenant-1', 'uuid-1', { code: 'ref_country', name: 'Country', dataType: 'reference' }, ctx),
      ).rejects.toThrow('config.referenceMaster');
    });
  });
});
