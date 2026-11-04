-- Links de uso único para cadastrar OUTRO aparelho (ex.: Face ID do iPhone) na MESMA conta.
-- Criados somente por usuário logado e com reconfirmação recente; expiram em 30 min; token guardado como hash.
CREATE TABLE device_links (
  id          TEXT PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,
  user_id     TEXT NOT NULL REFERENCES users(id),
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX device_links_user ON device_links(user_id);
