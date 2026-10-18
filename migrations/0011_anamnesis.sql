-- Anamnesis (ficha de salud): la completan la alumna y Yohi. Consentimiento separado del de mediciones.
ALTER TABLE users ADD COLUMN anamnesis_consent_at TEXT;
CREATE TABLE anamnesis (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  goal           TEXT NOT NULL DEFAULT '',
  experience     TEXT NOT NULL DEFAULT '',
  injuries       TEXT NOT NULL DEFAULT '',
  health_history TEXT NOT NULL DEFAULT '',
  updated_by     TEXT NOT NULL DEFAULT 'student' CHECK (updated_by IN ('student','coach')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
