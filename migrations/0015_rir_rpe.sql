-- RIR y RPE: Yohi puede dejar un objetivo por ejercicio y el alumno (o Yohi) registra el RPE de cada serie, además del RIR.
ALTER TABLE routine_exercises ADD COLUMN target_rir TEXT NOT NULL DEFAULT '';
ALTER TABLE routine_exercises ADD COLUMN target_rpe TEXT NOT NULL DEFAULT '';
ALTER TABLE training_logs ADD COLUMN rpe REAL;
-- Biseries: un ejercicio marcado así va junto al anterior (misma serie alternada). Varios seguidos forman triserie o circuito.
ALTER TABLE routine_exercises ADD COLUMN superset_prev INTEGER NOT NULL DEFAULT 0;
