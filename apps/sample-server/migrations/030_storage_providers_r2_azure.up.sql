-- Registers the Cloudflare R2 and Azure Blob providers for MAW Storage.
INSERT INTO maw_storage_providers (code, name, provider_type) VALUES
  ('r2',    'Cloudflare R2',        'r2'),
  ('azure', 'Azure Blob Storage',   'azure')
ON CONFLICT (code) DO NOTHING;
