-- MAW Storage: provider-agnostic file storage (folders are logical, objects live in
-- local disk / S3 / future providers). Tenant isolation is enforced in every query
-- via tenant_id. Credentials are AES-256-GCM ciphertext and never returned by APIs.

CREATE TABLE IF NOT EXISTS maw_storage_providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(32)  NOT NULL UNIQUE,
  name          VARCHAR(128) NOT NULL,
  provider_type VARCHAR(32)  NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO maw_storage_providers (code, name, provider_type) VALUES
  ('local', 'Local Storage', 'local'),
  ('s3',    'Amazon S3 / S3-compatible', 's3')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS maw_storage_provider_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64)  NOT NULL,
  provider_id           UUID         NOT NULL REFERENCES maw_storage_providers(id),
  name                  VARCHAR(128) NOT NULL,
  bucket_name           VARCHAR(255),
  region                VARCHAR(64),
  endpoint              VARCHAR(512),
  base_path             VARCHAR(255) NOT NULL DEFAULT '',
  encrypted_credentials TEXT,
  is_default            BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maw_storage_configs_tenant ON maw_storage_provider_configs (tenant_id);
CREATE INDEX idx_maw_storage_configs_tenant_default
  ON maw_storage_provider_configs (tenant_id) WHERE is_default AND is_active;

CREATE TABLE IF NOT EXISTS maw_storage_folders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64)  NOT NULL,
  storage_config_id UUID         NOT NULL REFERENCES maw_storage_provider_configs(id),
  parent_id         UUID         REFERENCES maw_storage_folders(id),
  name              VARCHAR(255) NOT NULL,
  path              TEXT         NOT NULL,
  created_by        VARCHAR(64),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_maw_storage_folders_tenant_parent ON maw_storage_folders (tenant_id, parent_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_maw_storage_folders_tenant_config ON maw_storage_folders (tenant_id, storage_config_id);
-- Sibling names are unique (case-insensitive) among active folders; root folders share a nil parent.
CREATE UNIQUE INDEX uq_maw_storage_folders_sibling_name
  ON maw_storage_folders (
    tenant_id,
    storage_config_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  ) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS maw_storage_files (
  id                UUID PRIMARY KEY,
  tenant_id         VARCHAR(64)  NOT NULL,
  storage_config_id UUID         NOT NULL REFERENCES maw_storage_provider_configs(id),
  folder_id         UUID         REFERENCES maw_storage_folders(id),
  original_name     VARCHAR(512) NOT NULL,
  object_key        VARCHAR(1024) NOT NULL,
  mime_type         VARCHAR(255) NOT NULL,
  extension         VARCHAR(32)  NOT NULL DEFAULT '',
  file_size         BIGINT       NOT NULL,
  checksum          VARCHAR(128),
  status            VARCHAR(16)  NOT NULL DEFAULT 'pending',
  visibility        VARCHAR(16)  NOT NULL DEFAULT 'private',
  uploaded_by       VARCHAR(64),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT maw_storage_files_status_check
    CHECK (status IN ('pending', 'uploading', 'uploaded', 'failed', 'deleted')),
  CONSTRAINT maw_storage_files_visibility_check CHECK (visibility IN ('private')),
  CONSTRAINT maw_storage_files_size_check CHECK (file_size >= 0)
);

CREATE UNIQUE INDEX uq_maw_storage_files_object ON maw_storage_files (storage_config_id, object_key);
CREATE INDEX idx_maw_storage_files_tenant_folder ON maw_storage_files (tenant_id, folder_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_maw_storage_files_tenant_config ON maw_storage_files (tenant_id, storage_config_id);
CREATE INDEX idx_maw_storage_files_tenant_status ON maw_storage_files (tenant_id, status);
-- Supports the future orphan-upload cleanup job (pending older than X hours).
CREATE INDEX idx_maw_storage_files_pending ON maw_storage_files (created_at)
  WHERE status IN ('pending', 'uploading');

CREATE TABLE IF NOT EXISTS maw_storage_file_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id        UUID         NOT NULL REFERENCES maw_storage_files(id) ON DELETE CASCADE,
  version_number INTEGER      NOT NULL,
  object_key     VARCHAR(1024) NOT NULL,
  file_size      BIGINT       NOT NULL,
  mime_type      VARCHAR(255) NOT NULL,
  checksum       VARCHAR(128),
  created_by     VARCHAR(64),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (file_id, version_number)
);

-- Generic attachments: no product-specific columns (invoice_id, employee_id, ...).
CREATE TABLE IF NOT EXISTS maw_storage_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   VARCHAR(64)  NOT NULL,
  file_id     UUID         NOT NULL REFERENCES maw_storage_files(id) ON DELETE CASCADE,
  entity_type VARCHAR(64)  NOT NULL,
  entity_id   VARCHAR(128) NOT NULL,
  category    VARCHAR(64)  NOT NULL DEFAULT 'general',
  created_by  VARCHAR(64),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, file_id, entity_type, entity_id, category)
);

CREATE INDEX idx_maw_storage_attachments_entity ON maw_storage_attachments (tenant_id, entity_type, entity_id);
CREATE INDEX idx_maw_storage_attachments_file ON maw_storage_attachments (file_id);
