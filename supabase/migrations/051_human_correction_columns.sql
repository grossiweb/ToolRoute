-- Migration 051: Add human-correction tracking to model_outcome_records
--
-- Two new columns capture human-in-the-loop overhead for agent telemetry:
--   human_correction_required  Did a human need to correct the model output? (boolean)
--   human_correction_minutes   How many minutes were spent correcting it?    (int)
--
-- Both are NULLable — agents that don't track this leave them unset.
-- Fully automated pipelines (Sol Coloring, Claudia) should pass false / NULL.
-- An index supports analytics like "what % of outcomes needed correction?"

ALTER TABLE model_outcome_records
  ADD COLUMN IF NOT EXISTS human_correction_required BOOLEAN,
  ADD COLUMN IF NOT EXISTS human_correction_minutes  INT;

CREATE INDEX IF NOT EXISTS idx_model_outcome_human_correction_required
  ON model_outcome_records(human_correction_required)
  WHERE human_correction_required = true;
