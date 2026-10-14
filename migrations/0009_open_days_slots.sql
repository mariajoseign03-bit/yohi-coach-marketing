-- Horas personalizadas por día: JSON ["16:00","17:30"]. NULL = las horas de la plantilla (mañana/tarde/9–13).
ALTER TABLE open_days ADD COLUMN slots TEXT;
