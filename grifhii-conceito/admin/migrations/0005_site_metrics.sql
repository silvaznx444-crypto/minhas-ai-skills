-- Monitoramento de visitas do site: SOMENTE contadores anônimos por dia (sem IP, sem cookie, sem dado pessoal).
CREATE TABLE IF NOT EXISTS site_metrics (
  day     TEXT NOT NULL,              -- AAAA-MM-DD (horário de Brasília)
  event   TEXT NOT NULL CHECK (event IN ('visit','view','brand','product','whatsapp','cart_add','checkout')),
  target  TEXT NOT NULL DEFAULT '',   -- página / marca / peça / origem do clique (slug curto)
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, target)
);
CREATE INDEX IF NOT EXISTS site_metrics_event_day ON site_metrics (event, day);
