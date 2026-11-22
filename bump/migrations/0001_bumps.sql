-- Bump del portfolio: una riga per dispositivo, il totale è COUNT(*).
-- Nessun dato personale in chiaro: dispositivo, IP e User-Agent sono HMAC con chiave segreta.
CREATE TABLE IF NOT EXISTS bumps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_hash TEXT    NOT NULL UNIQUE,      -- HMAC dell'identificativo casuale nel cookie
  ip_hash     TEXT,                         -- HMAC dell'IP; azzerato dopo 30 giorni
  ua_hash     TEXT,                         -- HMAC di IP + User-Agent; azzerato dopo 30 giorni
  created_at  INTEGER NOT NULL              -- epoch in secondi
);
CREATE INDEX IF NOT EXISTS bumps_ip_time ON bumps (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS bumps_ua_time ON bumps (ua_hash, created_at);

-- Limiti di frequenza a finestra fissa: chiave già hashata, finestra = inizio in secondi.
CREATE TABLE IF NOT EXISTS rate_limits (
  key        TEXT    NOT NULL,
  window     INTEGER NOT NULL,
  count      INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);
