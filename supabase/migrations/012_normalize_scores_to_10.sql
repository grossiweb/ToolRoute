-- Migration 012: Normalize all scores to 0-10 scale
-- Migrations 010 and 011 accidentally inserted scores on a 0-100 scale
-- This divides all scores > 10 by 10 to normalize to 0-10

UPDATE skill_scores
SET
  overall_score = CASE WHEN overall_score > 10 THEN overall_score / 10.0 ELSE overall_score END,
  trust_score = CASE WHEN trust_score > 10 THEN trust_score / 10.0 ELSE trust_score END,
  reliability_score = CASE WHEN reliability_score > 10 THEN reliability_score / 10.0 ELSE reliability_score END,
  output_score = CASE WHEN output_score > 10 THEN output_score / 10.0 ELSE output_score END,
  efficiency_score = CASE WHEN efficiency_score > 10 THEN efficiency_score / 10.0 ELSE efficiency_score END,
  cost_score = CASE WHEN cost_score > 10 THEN cost_score / 10.0 ELSE cost_score END,
  value_score = CASE WHEN value_score > 10 THEN value_score / 10.0 ELSE value_score END
WHERE overall_score > 10
   OR trust_score > 10
   OR reliability_score > 10
   OR output_score > 10
   OR efficiency_score > 10
   OR cost_score > 10
   OR value_score > 10;
