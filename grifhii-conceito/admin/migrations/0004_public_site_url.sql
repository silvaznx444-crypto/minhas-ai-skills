-- Nova configuração: endereço público do site (botão "Ver no site").
-- O SQLite não altera CHECK: recria a tabela COPIANDO as configurações já salvas (local de estoque, canais...).
CREATE TABLE application_settings_new (
  key         TEXT PRIMARY KEY CHECK (key IN ('shopify_location_id','shopify_publication_ids','api_capabilities','catalog_deploy_hook_enabled','public_site_url')),
  value       TEXT NOT NULL,
  updated_by  TEXT REFERENCES users(id),
  updated_at  INTEGER NOT NULL
);
INSERT INTO application_settings_new (key, value, updated_by, updated_at) SELECT key, value, updated_by, updated_at FROM application_settings;
DROP TABLE application_settings;
ALTER TABLE application_settings_new RENAME TO application_settings;
