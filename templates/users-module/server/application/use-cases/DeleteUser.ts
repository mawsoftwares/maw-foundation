import type { IUsersRepository } from '../../infrastructure/repositories/UserRepository';

export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: IUsersRepository,
    private readonly auditService?: { log: (event: string, data: Record<string, unknown>) => void },
  ) {}

  async execute(id: string, tenantId: string, actorId?: string): Promise<void> {
    const user = await this.userRepository.findById(id, tenantId);
    if (user === null) throw new Error('USER_NOT_FOUND');

    const deleted = await this.userRepository.softDelete(id, tenantId);
    if (!deleted) throw new Error('USER_NOT_FOUND');

    this.auditService?.log('USER_DELETED', { actor: actorId, target: id });
  }
}
