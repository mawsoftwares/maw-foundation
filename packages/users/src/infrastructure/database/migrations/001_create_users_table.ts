import type { Migration } from '@maw/database';

export const CreateUsersTableMigration: Migration = {
  version: '001',
  name: 'create_users_table',
  upSql: `
    CREATE TABLE users (
      id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      avatar VARCHAR(1024),
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      email_verified_at TIMESTAMP WITH TIME ZONE,
      phone_verified_at TIMESTAMP WITH TIME ZONE,
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255),
      updated_by VARCHAR(255),
      deleted_at TIMESTAMP WITH TIME ZONE,

      CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email),
      CONSTRAINT uq_users_tenant_phone UNIQUE (tenant_id, phone)
    );

    CREATE INDEX idx_users_tenant_id ON users(tenant_id);
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_phone ON users(phone);
    CREATE INDEX idx_users_status ON users(status);
    CREATE INDEX idx_users_created_at ON users(created_at);
    CREATE INDEX idx_users_deleted_at ON users(deleted_at);
  `,
  downSql: `
    DROP TABLE users;
  `
};
