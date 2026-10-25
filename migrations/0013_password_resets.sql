-- Códigos de 6 dígitos para recuperar la clave por correo (uno vigente por cuenta, se guarda solo su hash).
CREATE TABLE password_resets (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  tries      INTEGER NOT NULL DEFAULT 0
);
