-- Jobs queue table (persistent job processing)

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(128) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  context JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  result JSONB,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_type_status ON jobs (type, status);
CREATE INDEX idx_jobs_status ON jobs (status);
CREATE INDEX idx_jobs_retry ON jobs (status, next_retry_at) WHERE status = 'RETRYING';

-- File metadata table (tracks uploaded files)

CREATE TABLE IF NOT EXISTS file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  storage_key VARCHAR(1024) NOT NULL UNIQUE,
  original_name VARCHAR(512) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_by VARCHAR(64),
  url VARCHAR(2048),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_file_metadata_tenant ON file_metadata (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_file_metadata_key ON file_metadata (storage_key);
