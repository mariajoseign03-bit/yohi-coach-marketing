-- Notas e hitos que escribe Yohi en la ficha de cada alumna. visible = 1 → la alumna las ve en su portal; 0 → privada.
CREATE TABLE coach_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL DEFAULT 'note' CHECK (kind IN ('note','milestone')),
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL DEFAULT '',
  visible    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_coach_notes_user ON coach_notes(user_id, created_at);
