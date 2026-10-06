DELETE FROM maw_storage_providers
 WHERE code IN ('r2', 'azure')
   AND NOT EXISTS (SELECT 1 FROM maw_storage_provider_configs c WHERE c.provider_id = maw_storage_providers.id);
