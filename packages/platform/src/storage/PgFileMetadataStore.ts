import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, isNull, desc } from 'drizzle-orm';

export interface FileMetadataRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly storageKey: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly uploadedBy: string | null;
  readonly url: string | null;
  readonly createdAt: string;
  readonly deletedAt: string | null;
}

type FileRow = typeof schema.fileMetadata.$inferSelect;

function toRecord(row: FileRow): FileMetadataRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storageKey: row.storageKey,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    url: row.url,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

export class PgFileMetadataStore {
  constructor(private readonly db: DrizzleDb) {}

  async record(input: {
    tenantId: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy?: string;
    url?: string;
  }): Promise<FileMetadataRecord> {
    const rows = await this.db
      .insert(schema.fileMetadata)
      .values({
        tenantId: input.tenantId,
        storageKey: input.storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedBy: input.uploadedBy ?? null,
        url: input.url ?? null,
      })
      .returning();
    return toRecord(rows[0]!);
  }

  async findByKey(storageKey: string): Promise<FileMetadataRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.fileMetadata)
      .where(and(eq(schema.fileMetadata.storageKey, storageKey), isNull(schema.fileMetadata.deletedAt)));
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async listByTenant(tenantId: string, limit = 100): Promise<FileMetadataRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.fileMetadata)
      .where(and(eq(schema.fileMetadata.tenantId, tenantId), isNull(schema.fileMetadata.deletedAt)))
      .orderBy(desc(schema.fileMetadata.createdAt))
      .limit(limit);
    return rows.map(toRecord);
  }

  async softDelete(storageKey: string): Promise<void> {
    await this.db
      .update(schema.fileMetadata)
      .set({ deletedAt: new Date() })
      .where(and(eq(schema.fileMetadata.storageKey, storageKey), isNull(schema.fileMetadata.deletedAt)));
  }
}
