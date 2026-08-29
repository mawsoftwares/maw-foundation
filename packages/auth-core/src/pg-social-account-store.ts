import type { ISocialAccountStore, SocialAccountLink } from './social-auth';

export interface PgPool {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

interface SocialAccountRow {
  [key: string]: unknown;
  user_id: string;
  provider: string;
  provider_id: string;
  linked_at: string;
}

export class PgSocialAccountStore implements ISocialAccountStore {
  constructor(private readonly pool: PgPool) {}

  async link(userId: string, provider: string, providerId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO social_account_links (user_id, provider, provider_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, provider_id) DO UPDATE SET user_id = $1, linked_at = NOW()`,
      [userId, provider, providerId],
    );
  }

  async findByProvider(provider: string, providerId: string): Promise<SocialAccountLink | null> {
    const { rows } = await this.pool.query<SocialAccountRow>(
      `SELECT user_id, provider, provider_id, linked_at::TEXT
       FROM social_account_links
       WHERE provider = $1 AND provider_id = $2`,
      [provider, providerId],
    );
    return rows.length > 0 ? this.toLink(rows[0]!) : null;
  }

  async findByUser(userId: string): Promise<readonly SocialAccountLink[]> {
    const { rows } = await this.pool.query<SocialAccountRow>(
      `SELECT user_id, provider, provider_id, linked_at::TEXT
       FROM social_account_links
       WHERE user_id = $1
       ORDER BY linked_at`,
      [userId],
    );
    return rows.map(this.toLink);
  }

  async unlink(userId: string, provider: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM social_account_links WHERE user_id = $1 AND provider = $2`,
      [userId, provider],
    );
  }

  private toLink(row: SocialAccountRow): SocialAccountLink {
    return {
      userId: row.user_id,
      provider: row.provider,
      providerId: row.provider_id,
      linkedAt: row.linked_at,
    };
  }
}
