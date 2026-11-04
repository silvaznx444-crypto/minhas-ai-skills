-- GRIFHII ADMIN — esquema inicial (Cloudflare D1 / SQLite).
-- A Shopify é a fonte oficial de produtos, variantes, preços e estoque.
-- Este banco guarda apenas: usuários/credenciais do painel, sessões, permissões,
-- jornal de operações (idempotência), eventos de webhook, auditoria, preferências e metadados de mídia.
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            TEXT PRIMARY KEY,                       -- UUID
  display_name  TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  role          TEXT NOT NULL CHECK (role IN ('OWNER','MANAGER','EMPLOYEE')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  webauthn_user_id TEXT NOT NULL UNIQUE,                -- base64url aleatório (não é o id interno)
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
-- Só pode existir UM proprietário principal.
CREATE UNIQUE INDEX one_owner ON users(role) WHERE role = 'OWNER';

-- Permissões granulares para MANAGER/EMPLOYEE (OWNER tem todas, verificado no código).
CREATE TABLE user_permissions (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL CHECK (permission IN (
    'products:read','products:write','products:publish','products:delete',
    'inventory:read','inventory:write','prices:write','media:write',
    'categories:write','sync:read','sync:retry','audit:read')),
  PRIMARY KEY (user_id, permission)
);

CREATE TABLE passkeys (
  credential_id TEXT PRIMARY KEY,                       -- base64url
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key    BLOB NOT NULL,
  counter       INTEGER NOT NULL DEFAULT 0 CHECK (counter >= 0),
  transports    TEXT,                                   -- JSON array
  device_type   TEXT,
  backed_up     INTEGER NOT NULL DEFAULT 0,
  label         TEXT CHECK (label IS NULL OR length(label) <= 60),
  created_at    INTEGER NOT NULL,
  last_used_at  INTEGER
);
CREATE INDEX passkeys_user ON passkeys(user_id);

-- Desafios WebAuthn de uso único (expiram em 5 min).
CREATE TABLE webauthn_challenges (
  id          TEXT PRIMARY KEY,
  challenge   TEXT NOT NULL UNIQUE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('register','login','reauth')),
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  meta        TEXT,                                     -- JSON (ex.: nome no cadastro inicial, id do convite)
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

-- Convites para novos usuários (somente OWNER cria). Token guardado como hash.
CREATE TABLE invites (
  id          TEXT PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('MANAGER','EMPLOYEE')),
  permissions TEXT NOT NULL,                            -- JSON array validado no código
  display_name TEXT NOT NULL,
  created_by  TEXT NOT NULL REFERENCES users(id),
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);

-- Códigos de recuperação (alta entropia, guardados como SHA-256; uso único).
CREATE TABLE recovery_codes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL UNIQUE,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);

-- Sessões: o cookie leva um token aleatório; aqui fica só o hash.
CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,
  token_hash      TEXT NOT NULL UNIQUE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token      TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL,
  authenticated_at INTEGER NOT NULL,                    -- última verificação forte (step-up)
  expires_at      INTEGER NOT NULL,                     -- expiração absoluta
  revoked_at      INTEGER,
  user_agent      TEXT,
  ip_hash         TEXT
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Limitação de tentativas (janela fixa).
CREATE TABLE rate_limits (
  bucket      TEXT NOT NULL,
  key         TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count       INTEGER NOT NULL,
  PRIMARY KEY (bucket, key, window_start)
);

-- Jornal de operações: idempotência + retomada segura de passos.
CREATE TABLE operations (
  id              TEXT PRIMARY KEY,                     -- chave de idempotência (UUID do cliente)
  user_id         TEXT NOT NULL REFERENCES users(id),
  kind            TEXT NOT NULL CHECK (kind IN ('product.create','product.add_color','product.update_price',
                    'product.publish','product.unpublish','inventory.set','media.attach')),
  request_hash    TEXT NOT NULL,                        -- mesma chave + corpo diferente = rejeitado
  payload         TEXT NOT NULL,                        -- JSON validado (sem segredos)
  status          TEXT NOT NULL CHECK (status IN ('pending','running','succeeded','failed','needs_attention')),
  step            TEXT NOT NULL DEFAULT 'start',
  state           TEXT NOT NULL DEFAULT '{}',           -- IDs Shopify já criados (JSON)
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER,
  last_error      TEXT,
  shopify_product_id TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX operations_status ON operations(status, next_attempt_at);
CREATE INDEX operations_product ON operations(shopify_product_id);

-- Webhooks recebidos (deduplicação).
CREATE TABLE webhook_events (
  event_id     TEXT PRIMARY KEY,                        -- X-Shopify-Event-Id (ou Webhook-Id)
  topic        TEXT NOT NULL,
  resource_gid TEXT,
  triggered_at TEXT,
  received_at  INTEGER NOT NULL,
  processed_at INTEGER,
  result       TEXT
);

-- Espelho (cache) de produtos para o painel: NÃO é fonte de verdade; reconstruível a partir da Shopify.
CREATE TABLE product_cache (
  shopify_product_id TEXT PRIMARY KEY,
  handle        TEXT NOT NULL,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL,
  shopify_updated_at TEXT NOT NULL,
  data          TEXT NOT NULL,                          -- JSON (variantes, estoque, mídia)
  synced_at     INTEGER NOT NULL,
  sync_state    TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('synced','pending','failed','needs_attention'))
);

-- Preferências de apresentação do site (não comerciais).
CREATE TABLE product_preferences (
  shopify_product_id TEXT PRIMARY KEY,
  site_slug     TEXT UNIQUE,
  category      TEXT,
  featured      INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL
);

-- Metadados de mídia: diferencia FOTO REAL de IMAGEM REPRESENTATIVA 3D, por cor.
CREATE TABLE product_media (
  id            TEXT PRIMARY KEY,
  shopify_product_id TEXT NOT NULL,
  shopify_media_id   TEXT UNIQUE,
  role          TEXT NOT NULL CHECK (role IN ('photo','render3d')),
  color         TEXT,
  status        TEXT NOT NULL CHECK (status IN ('uploading','processing','ready','failed')),
  sha256        TEXT NOT NULL,                          -- evita duplicar o mesmo arquivo
  width         INTEGER,
  height        INTEGER,
  bytes         INTEGER,
  created_by    TEXT REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  UNIQUE (shopify_product_id, sha256)
);

CREATE TABLE categories (
  slug        TEXT PRIMARY KEY CHECK (slug GLOB '[a-z0-9-]*' AND length(slug) BETWEEN 2 AND 40),
  label       TEXT NOT NULL CHECK (length(label) BETWEEN 2 AND 40),
  shopify_product_type TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
INSERT INTO categories (slug,label,shopify_product_type,sort_order,created_at) VALUES
  ('camisetas','Camisetas','Camisetas',1,0),('polos','Polos','Polos',2,0),('bermudas','Bermudas','Bermudas',3,0),
  ('shorts','Shorts','Shorts',4,0),('jeans','Jeans','Jeans',5,0),('bones','Bonés','Bonés',6,0),
  ('camisas-sociais','Camisas sociais','Camisas',7,0);

-- Auditoria: somente acréscimo. Nunca guardar tokens, cookies ou segredos.
CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  at          INTEGER NOT NULL,
  user_id     TEXT,
  action      TEXT NOT NULL,
  target      TEXT,
  operation_id TEXT,
  result      TEXT NOT NULL CHECK (result IN ('attempt','success','failure','denied')),
  details     TEXT,                                     -- JSON resumido
  support_id  TEXT
);
CREATE INDEX audit_at ON audit_logs(at DESC);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT,'audit_logs is append-only'); END;
-- Exclusão só para retenção (registros com mais de 1 ano).
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_logs
  WHEN OLD.at > (CAST(strftime('%s','now') AS INTEGER) * 1000 - 365 * 86400000)
  BEGIN SELECT RAISE(ABORT,'audit_logs: retention is 365 days'); END;

CREATE TABLE application_settings (
  key         TEXT PRIMARY KEY CHECK (key IN ('shopify_location_id','shopify_publication_ids','api_capabilities','catalog_deploy_hook_enabled')),
  value       TEXT NOT NULL,
  updated_by  TEXT REFERENCES users(id),
  updated_at  INTEGER NOT NULL
);
