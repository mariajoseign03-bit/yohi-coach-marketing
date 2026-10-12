-- Rutinas diarias: day_on = fecha del día (y week_of guarda esa misma fecha). NULL = rutina semanal.
ALTER TABLE routines ADD COLUMN day_on TEXT;
