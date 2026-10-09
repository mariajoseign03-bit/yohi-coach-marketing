-- Consentimiento separado y explícito para tratar datos de salud (mediciones corporales).
ALTER TABLE users ADD COLUMN health_consent_at TEXT;
