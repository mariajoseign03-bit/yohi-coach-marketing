-- Renovaciones: el alumno sube el comprobante de su transferencia y Yohi lo revisa y renueva el plan.
CREATE TABLE renewals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id       INTEGER REFERENCES plans(id) ON DELETE SET NULL,   -- plan que tenía al pedir
  new_plan_id   INTEGER REFERENCES plans(id) ON DELETE SET NULL,   -- plan creado al aprobar
  note          TEXT NOT NULL DEFAULT '',
  file_name     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at    TEXT
);
CREATE INDEX idx_renewals_user ON renewals(user_id, id);
CREATE INDEX idx_renewals_status ON renewals(status, id);
-- El comprobante (PDF, PNG o JPG) se guarda en trozos de texto base64, igual que los informes.
CREATE TABLE renewal_chunks (
  renewal_id INTEGER NOT NULL REFERENCES renewals(id) ON DELETE CASCADE,
  seq        INTEGER NOT NULL,
  data       TEXT NOT NULL,
  PRIMARY KEY (renewal_id, seq)
);
-- Ajustes del portal que edita Yohi (por ahora: datos para transferir).
CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
