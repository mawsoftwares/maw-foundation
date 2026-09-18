-- Application Management Platform: versioned email templates.
-- The live content lives in email_template_versions; email_templates tracks
-- identity and which version is currently active, so edits are versioned and
-- never silently break an application already sending against an older one.

CREATE TABLE IF NOT EXISTS email_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               VARCHAR(100) NOT NULL,
  name               VARCHAR(200) NOT NULL,
  application_id     UUID REFERENCES applications(id) ON DELETE CASCADE,
  environment        VARCHAR(20),
  active_version_id  UUID,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_templates_environment_check CHECK (environment IS NULL OR environment IN ('development', 'staging', 'production'))
);

-- Scoped uniqueness: one code per (application-or-global, environment).
-- COALESCE folds NULL application_id ("global") and NULL environment ("all
-- environments") into real index keys, since a plain UNIQUE constraint would
-- treat every NULL as distinct and not actually enforce this.
CREATE UNIQUE INDEX email_templates_scope_code_unique ON email_templates (
  COALESCE(application_id::text, 'GLOBAL'), code, COALESCE(environment, 'ALL')
);
CREATE INDEX idx_email_templates_application ON email_templates (application_id);
CREATE INDEX idx_email_templates_code ON email_templates (code);

CREATE TABLE IF NOT EXISTS email_template_versions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version             INTEGER NOT NULL,
  subject             VARCHAR(500) NOT NULL,
  html_body           TEXT,
  text_body           TEXT,
  required_variables  JSONB NOT NULL DEFAULT '[]',
  default_values      JSONB NOT NULL DEFAULT '{}',
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX email_template_versions_template_version_unique ON email_template_versions (template_id, version);
CREATE INDEX idx_email_template_versions_template ON email_template_versions (template_id);

ALTER TABLE email_templates ADD CONSTRAINT email_templates_active_version_fk
  FOREIGN KEY (active_version_id) REFERENCES email_template_versions(id) ON DELETE SET NULL;
