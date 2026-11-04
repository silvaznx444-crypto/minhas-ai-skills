// GERADO por tools/build-pages.mjs a partir de migrations/*.sql — não editar à mão.
export const MIGRATIONS: { name: string; statements: string[] }[] = [
  {
    "name": "0001_init.sql",
    "statements": [
      "PRAGMA foreign_keys = ON",
      "CREATE TABLE users (\n  id            TEXT PRIMARY KEY,\n  display_name  TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),\n  role          TEXT NOT NULL CHECK (role IN ('OWNER','MANAGER','EMPLOYEE')),\n  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),\n  webauthn_user_id TEXT NOT NULL UNIQUE,\n  created_at    INTEGER NOT NULL,\n  updated_at    INTEGER NOT NULL\n)",
      "CREATE UNIQUE INDEX one_owner ON users(role) WHERE role = 'OWNER'",
      "CREATE TABLE user_permissions (\n  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  permission  TEXT NOT NULL CHECK (permission IN (\n    'products:read','products:write','products:publish','products:delete',\n    'inventory:read','inventory:write','prices:write','media:write',\n    'categories:write','sync:read','sync:retry','audit:read')),\n  PRIMARY KEY (user_id, permission)\n)",
      "CREATE TABLE passkeys (\n  credential_id TEXT PRIMARY KEY,\n  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  public_key    BLOB NOT NULL,\n  counter       INTEGER NOT NULL DEFAULT 0 CHECK (counter >= 0),\n  transports    TEXT,\n  device_type   TEXT,\n  backed_up     INTEGER NOT NULL DEFAULT 0,\n  label         TEXT CHECK (label IS NULL OR length(label) <= 60),\n  created_at    INTEGER NOT NULL,\n  last_used_at  INTEGER\n)",
      "CREATE INDEX passkeys_user ON passkeys(user_id)",
      "CREATE TABLE webauthn_challenges (\n  id          TEXT PRIMARY KEY,\n  challenge   TEXT NOT NULL UNIQUE,\n  purpose     TEXT NOT NULL CHECK (purpose IN ('register','login','reauth')),\n  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,\n  meta        TEXT,\n  expires_at  INTEGER NOT NULL,\n  created_at  INTEGER NOT NULL\n)",
      "CREATE TABLE invites (\n  id          TEXT PRIMARY KEY,\n  token_hash  TEXT NOT NULL UNIQUE,\n  role        TEXT NOT NULL CHECK (role IN ('MANAGER','EMPLOYEE')),\n  permissions TEXT NOT NULL,\n  display_name TEXT NOT NULL,\n  created_by  TEXT NOT NULL REFERENCES users(id),\n  expires_at  INTEGER NOT NULL,\n  used_at     INTEGER,\n  created_at  INTEGER NOT NULL\n)",
      "CREATE TABLE recovery_codes (\n  id          TEXT PRIMARY KEY,\n  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  code_hash   TEXT NOT NULL UNIQUE,\n  used_at     INTEGER,\n  created_at  INTEGER NOT NULL\n)",
      "CREATE TABLE sessions (\n  id              TEXT PRIMARY KEY,\n  token_hash      TEXT NOT NULL UNIQUE,\n  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  csrf_token      TEXT NOT NULL,\n  created_at      INTEGER NOT NULL,\n  last_seen_at    INTEGER NOT NULL,\n  authenticated_at INTEGER NOT NULL,\n  expires_at      INTEGER NOT NULL,\n  revoked_at      INTEGER,\n  user_agent      TEXT,\n  ip_hash         TEXT\n)",
      "CREATE INDEX sessions_user ON sessions(user_id)",
      "CREATE TABLE rate_limits (\n  bucket      TEXT NOT NULL,\n  key         TEXT NOT NULL,\n  window_start INTEGER NOT NULL,\n  count       INTEGER NOT NULL,\n  PRIMARY KEY (bucket, key, window_start)\n)",
      "CREATE TABLE operations (\n  id              TEXT PRIMARY KEY,\n  user_id         TEXT NOT NULL REFERENCES users(id),\n  kind            TEXT NOT NULL CHECK (kind IN ('product.create','product.add_color','product.update_price',\n                    'product.publish','product.unpublish','inventory.set','media.attach')),\n  request_hash    TEXT NOT NULL,\n  payload         TEXT NOT NULL,\n  status          TEXT NOT NULL CHECK (status IN ('pending','running','succeeded','failed','needs_attention')),\n  step            TEXT NOT NULL DEFAULT 'start',\n  state           TEXT NOT NULL DEFAULT '{}',\n  attempts        INTEGER NOT NULL DEFAULT 0,\n  next_attempt_at INTEGER,\n  last_error      TEXT,\n  shopify_product_id TEXT,\n  created_at      INTEGER NOT NULL,\n  updated_at      INTEGER NOT NULL\n)",
      "CREATE INDEX operations_status ON operations(status, next_attempt_at)",
      "CREATE INDEX operations_product ON operations(shopify_product_id)",
      "CREATE TABLE webhook_events (\n  event_id     TEXT PRIMARY KEY,\n  topic        TEXT NOT NULL,\n  resource_gid TEXT,\n  triggered_at TEXT,\n  received_at  INTEGER NOT NULL,\n  processed_at INTEGER,\n  result       TEXT\n)",
      "CREATE TABLE product_cache (\n  shopify_product_id TEXT PRIMARY KEY,\n  handle        TEXT NOT NULL,\n  title         TEXT NOT NULL,\n  status        TEXT NOT NULL,\n  shopify_updated_at TEXT NOT NULL,\n  data          TEXT NOT NULL,\n  synced_at     INTEGER NOT NULL,\n  sync_state    TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('synced','pending','failed','needs_attention'))\n)",
      "CREATE TABLE product_preferences (\n  shopify_product_id TEXT PRIMARY KEY,\n  site_slug     TEXT UNIQUE,\n  category      TEXT,\n  featured      INTEGER NOT NULL DEFAULT 0,\n  sort_order    INTEGER NOT NULL DEFAULT 0,\n  updated_at    INTEGER NOT NULL\n)",
      "CREATE TABLE product_media (\n  id            TEXT PRIMARY KEY,\n  shopify_product_id TEXT NOT NULL,\n  shopify_media_id   TEXT UNIQUE,\n  role          TEXT NOT NULL CHECK (role IN ('photo','render3d')),\n  color         TEXT,\n  status        TEXT NOT NULL CHECK (status IN ('uploading','processing','ready','failed')),\n  sha256        TEXT NOT NULL,\n  width         INTEGER,\n  height        INTEGER,\n  bytes         INTEGER,\n  created_by    TEXT REFERENCES users(id),\n  created_at    INTEGER NOT NULL,\n  UNIQUE (shopify_product_id, sha256)\n)",
      "CREATE TABLE categories (\n  slug        TEXT PRIMARY KEY CHECK (slug GLOB '[a-z0-9-]*' AND length(slug) BETWEEN 2 AND 40),\n  label       TEXT NOT NULL CHECK (length(label) BETWEEN 2 AND 40),\n  shopify_product_type TEXT NOT NULL,\n  sort_order  INTEGER NOT NULL DEFAULT 0,\n  created_at  INTEGER NOT NULL\n)",
      "INSERT INTO categories (slug,label,shopify_product_type,sort_order,created_at) VALUES\n  ('camisetas','Camisetas','Camisetas',1,0),('polos','Polos','Polos',2,0),('bermudas','Bermudas','Bermudas',3,0),\n  ('shorts','Shorts','Shorts',4,0),('jeans','Jeans','Jeans',5,0),('bones','Bonés','Bonés',6,0),\n  ('camisas-sociais','Camisas sociais','Camisas',7,0)",
      "CREATE TABLE audit_logs (\n  id          TEXT PRIMARY KEY,\n  at          INTEGER NOT NULL,\n  user_id     TEXT,\n  action      TEXT NOT NULL,\n  target      TEXT,\n  operation_id TEXT,\n  result      TEXT NOT NULL CHECK (result IN ('attempt','success','failure','denied')),\n  details     TEXT,\n  support_id  TEXT\n)",
      "CREATE INDEX audit_at ON audit_logs(at DESC)",
      "CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT,'audit_logs is append-only'); END;",
      "CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_logs\n  WHEN OLD.at > (CAST(strftime('%s','now') AS INTEGER) * 1000 - 365 * 86400000)\n  BEGIN SELECT RAISE(ABORT,'audit_logs: retention is 365 days'); END;",
      "CREATE TABLE application_settings (\n  key         TEXT PRIMARY KEY CHECK (key IN ('shopify_location_id','shopify_publication_ids','api_capabilities','catalog_deploy_hook_enabled')),\n  value       TEXT NOT NULL,\n  updated_by  TEXT REFERENCES users(id),\n  updated_at  INTEGER NOT NULL\n)"
    ]
  },
  {
    "name": "0002_device_links.sql",
    "statements": [
      "CREATE TABLE device_links (\n  id          TEXT PRIMARY KEY,\n  token_hash  TEXT NOT NULL UNIQUE,\n  user_id     TEXT NOT NULL REFERENCES users(id),\n  expires_at  INTEGER NOT NULL,\n  used_at     INTEGER,\n  created_at  INTEGER NOT NULL\n)",
      "CREATE INDEX device_links_user ON device_links(user_id)"
    ]
  },
  {
    "name": "0003_site_categories.sql",
    "statements": [
      "INSERT OR IGNORE INTO categories (slug,label,shopify_product_type,sort_order,created_at) VALUES\n  ('calcas','Calças','Calças',8,0),\n  ('conjuntos','Conjuntos','Conjuntos',9,0),\n  ('moletons','Moletons','Moletons',10,0),\n  ('esportivo','Esportivo','Esportivo',11,0),\n  ('calcados','Calçados','Calçados',12,0),\n  ('cintos','Cintos','Cintos',13,0),\n  ('acessorios','Acessórios','Acessórios',14,0)"
    ]
  }
];
