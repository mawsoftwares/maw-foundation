import type { Migration } from '@mawsoftwares/database';

/**
 * Users Module Template — Database Migration
 *
 * This schema is the baseline. In your project:
 *   - ADD columns for project-specific fields
 *   - Add unique constraints as needed (e.g. employee_code per tenant)
 *   - Add indexes for your query patterns
 *
 * Example extensions:
 *   -- HR / ERP
 *   employee_code  VARCHAR(100),
 *   department_id  VARCHAR(255),
 *   plant_id       VARCHAR(255),
 *   designation    VARCHAR(255),
 *   shift          VARCHAR(50),
 *   joining_date   DATE,
 *
 *   -- Restaurant SaaS
 *   waiter_code    VARCHAR(100),
 *   outlet_id      VARCHAR(255),
 *   cashier_access BOOLEAN DEFAULT false,
 *   kitchen_access BOOLEAN DEFAULT false,
 */
export const CreateUsersTableMigration: Migration = {
  version: '001',
  name: 'create_users_table',
  upSql: `
    CREATE TABLE users (
      id                VARCHAR(255)  PRIMARY KEY,
      tenant_id         VARCHAR(255)  NOT NULL,
      first_name        VARCHAR(255)  NOT NULL,
      last_name         VARCHAR(255)  NOT NULL,
      email             VARCHAR(255)  NOT NULL,
      phone             VARCHAR(255),
      password_hash     VARCHAR(255)  NOT NULL DEFAULT '',
      avatar            VARCHAR(1024),
      role              VARCHAR(100),
      status            VARCHAR(50)   NOT NULL DEFAULT 'ACTIVE',
      email_verified_at TIMESTAMPTZ,
      phone_verified_at TIMESTAMPTZ,
      last_login_at     TIMESTAMPTZ,
      created_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by        VARCHAR(255),
      updated_by        VARCHAR(255),
      deleted_at        TIMESTAMPTZ,

      -- ADD project-specific columns above this line

      CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email),
      CONSTRAINT uq_users_tenant_phone UNIQUE (tenant_id, phone)
    );

    CREATE INDEX idx_users_tenant_id  ON users(tenant_id);
    CREATE INDEX idx_users_email      ON users(email);
    CREATE INDEX idx_users_phone      ON users(phone);
    CREATE INDEX idx_users_role       ON users(role);
    CREATE INDEX idx_users_status     ON users(status);
    CREATE INDEX idx_users_created_at ON users(created_at);
    CREATE INDEX idx_users_deleted_at ON users(deleted_at);
  `,
  downSql: `DROP TABLE users;`,
};
