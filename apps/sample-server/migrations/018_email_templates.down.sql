ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_active_version_fk;
DROP TABLE IF EXISTS email_template_versions;
DROP TABLE IF EXISTS email_templates;
