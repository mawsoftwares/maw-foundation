import type { IOfflineRepository, EntityMeta, OfflineEntityConfig } from '@mawsoftwares/sdk/contracts/IOfflineRepository';
import type { ApiClient } from '../index';

/**
 * Pass-through repository when offline is disabled.
 * Every method delegates directly to ApiClient.request(). Zero overhead.
 */
export class OnlineOnlyRepository<T> implements IOfflineRepository<T> {
  constructor(
    private readonly client: ApiClient,
    private readonly config: OfflineEntityConfig,
  ) {}

  async findAll(params?: Record<string, unknown>): Promise<{ readonly data: readonly T[]; readonly meta?: readonly EntityMeta[] }> {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const data = await this.client.request<T[]>(`${this.config.apiBasePath}${query}`);
    return { data };
  }

  async findById(id: string): Promise<{ readonly data: T; readonly meta?: EntityMeta } | null> {
    try {
      const data = await this.client.request<T>(`${this.config.apiBasePath}/${id}`);
      return { data };
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) return null;
      throw err;
    }
  }

  async create(data: Partial<T>): Promise<{ readonly data: T; readonly meta?: EntityMeta }> {
    const result = await this.client.request<T>(this.config.apiBasePath, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { data: result };
  }

  async update(id: string, data: Partial<T>): Promise<{ readonly data: T; readonly meta?: EntityMeta }> {
    const result = await this.client.request<T>(`${this.config.apiBasePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return { data: result };
  }

  async remove(id: string): Promise<void> {
    await this.client.request<void>(`${this.config.apiBasePath}/${id}`, { method: 'DELETE' });
  }

  async sync(): Promise<void> {
    // No-op: offline is disabled
  }
}
