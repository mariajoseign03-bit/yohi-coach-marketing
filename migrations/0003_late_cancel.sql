-- Cancelación tardía (menos de 24 h antes): la sesión no se devuelve al plan.
ALTER TABLE bookings ADD COLUMN late_cancel INTEGER NOT NULL DEFAULT 0;
