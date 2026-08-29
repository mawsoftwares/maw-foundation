import type { Migration } from '@mawsoftwares/database';

/**
 * CRUD Module Template — Database Migration
 *
 * REPLACE: `entities` → your table name; add/remove columns.
 */
export const CreateEntitiesTableMigration: Migration = {
  version: '001',
  name: 'create_entities_table',
  upSql: `
    CREATE TABLE entities (
      id            VARCHAR(255)  PRIMARY KEY,
      tenant_id     VARCHAR(255)  NOT NULL,
      name          VARCHAR(255)  NOT NULL,
      description   TEXT,
      status        VARCHAR(50)   NOT NULL DEFAULT 'active',
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by    VARCHAR(255),
      updated_by    VARCHAR(255),
      deleted_at    TIMESTAMPTZ,

      CONSTRAINT uq_entities_tenant_name UNIQUE (tenant_id, name)
    );

    CREATE INDEX idx_entities_tenant_id ON entities(tenant_id);
    CREATE INDEX idx_entities_status    ON entities(status);
    CREATE INDEX idx_entities_deleted_at ON entities(deleted_at);
  `,
  downSql: `DROP TABLE entities;`,
};
