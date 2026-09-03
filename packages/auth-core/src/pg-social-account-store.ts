import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and } from 'drizzle-orm';
import type { ISocialAccountStore, SocialAccountLink } from './social-auth';

export class PgSocialAccountStore implements ISocialAccountStore {
  constructor(private readonly db: DrizzleDb) {}

  async link(userId: string, provider: string, providerId: string): Promise<void> {
    await this.db
      .insert(schema.socialAccountLinks)
      .values({ userId, provider, providerId })
      .onConflictDoUpdate({
        target: [schema.socialAccountLinks.provider, schema.socialAccountLinks.providerId],
        set: { userId, linkedAt: new Date() },
      });
  }

  async findByProvider(provider: string, providerId: string): Promise<SocialAccountLink | null> {
    const rows = await this.db
      .select()
      .from(schema.socialAccountLinks)
      .where(and(eq(schema.socialAccountLinks.provider, provider), eq(schema.socialAccountLinks.providerId, providerId)));
    return rows[0] ? this.toLink(rows[0]) : null;
  }

  async findByUser(userId: string): Promise<readonly SocialAccountLink[]> {
    const rows = await this.db
      .select()
      .from(schema.socialAccountLinks)
      .where(eq(schema.socialAccountLinks.userId, userId))
      .orderBy(schema.socialAccountLinks.linkedAt);
    return rows.map(this.toLink);
  }

  async unlink(userId: string, provider: string): Promise<void> {
    await this.db
      .delete(schema.socialAccountLinks)
      .where(and(eq(schema.socialAccountLinks.userId, userId), eq(schema.socialAccountLinks.provider, provider)));
  }

  private toLink(row: typeof schema.socialAccountLinks.$inferSelect): SocialAccountLink {
    return {
      userId: row.userId,
      provider: row.provider,
      providerId: row.providerId,
      linkedAt: row.linkedAt.toISOString(),
    };
  }
}
