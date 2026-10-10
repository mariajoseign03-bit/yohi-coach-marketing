-- Informe PDF de Body Pro Go asociado a una medición (guardado en trozos de texto base64).
ALTER TABLE measurements ADD COLUMN pdf_name TEXT;
CREATE TABLE pdf_chunks (measurement_id INTEGER NOT NULL REFERENCES measurements(id) ON DELETE CASCADE, seq INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (measurement_id, seq));
