-- Application Management Platform: Service Gateway request logs.
-- id doubles as the requestId returned to the caller. error_code is a safe,
-- redacted code only — never a raw provider error message or stack trace.

CREATE TABLE IF NOT EXISTS service_request_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL,
  application_id   UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  environment_id   UUID NOT NULL REFERENCES application_environments(id) ON DELETE CASCADE,
  credential_id    UUID REFERENCES application_credentials(id) ON DELETE SET NULL,
  service_code     VARCHAR(50) NOT NULL,
  endpoint         VARCHAR(200) NOT NULL,
  method           VARCHAR(10) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'accepted',
  provider         VARCHAR(50),
  duration_ms      INTEGER,
  error_code       VARCHAR(50),
  retry_count      INTEGER NOT NULL DEFAULT 0,
  idempotency_key  VARCHAR(200),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_request_logs_status_check CHECK (status IN ('accepted', 'queued', 'processing', 'sent', 'delivered', 'failed', 'rejected'))
);

CREATE INDEX idx_service_request_logs_application ON service_request_logs (application_id, created_at DESC);
CREATE INDEX idx_service_request_logs_environment ON service_request_logs (environment_id, created_at DESC);
CREATE INDEX idx_service_request_logs_tenant ON service_request_logs (tenant_id, created_at DESC);
CREATE INDEX idx_service_request_logs_idempotency ON service_request_logs (idempotency_key);
CREATE INDEX idx_service_request_logs_status ON service_request_logs (status, created_at DESC);
