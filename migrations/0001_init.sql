-- Esquema del portal de alumnos de Yohi Coach (Cloudflare D1)
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, pass_hash TEXT NOT NULL, pass_salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','disabled')), consent_version TEXT, consent_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE plans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, modality TEXT NOT NULL CHECK (modality IN ('presencial','online')), sede TEXT CHECK (sede IN ('quilpue','vina','quillota')), sessions_total INTEGER, start_date TEXT NOT NULL, end_date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE open_days (day TEXT PRIMARY KEY, mode TEXT NOT NULL CHECK (mode IN ('am','pm','wk','closed')), sede TEXT NOT NULL DEFAULT 'quilpue');
CREATE TABLE bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE, day TEXT NOT NULL, time TEXT NOT NULL, sede TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','rejected','cancelled','done')), gcal_event_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), decided_at TEXT);
CREATE UNIQUE INDEX one_active_booking_per_slot ON bookings(day, time) WHERE status IN ('requested','confirmed');
CREATE TABLE measurements (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, measured_on TEXT NOT NULL, weight_kg REAL, fat_pct REAL, muscle_kg REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX idx_bookings_user ON bookings(user_id, status);
CREATE INDEX idx_plans_user ON plans(user_id);
CREATE INDEX idx_measurements_user ON measurements(user_id, measured_on);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
