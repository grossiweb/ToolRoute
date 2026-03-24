-- Migration 034: Compress skill scores to Consumer Reports style
--
-- Problem: Seed scores are clustered at 9-10, making everything look perfect.
-- No tool should score near 10. Even the best should have room to improve.
--
-- Consumer Reports approach:
--   85+ out of 100 = Excellent (rare)
--   75-84 = Very Good
--   65-74 = Good
--   Below 65 = Average/Needs Improvement
--
-- Formula: new_score = (old_score - 5) * 0.7 + 5
--   10.0 → 8.5 (max possible — "excellent")
--   9.5  → 8.15
--   9.0  → 7.8
--   8.5  → 7.45
--   8.0  → 7.1
--   7.0  → 6.4
--   6.0  → 5.7
--
-- Hard cap at 8.8 (nobody's perfect), floor at 5.0

UPDATE skill_scores SET
  output_score     = LEAST(8.8, GREATEST(5.0, (output_score - 5) * 0.7 + 5)),
  reliability_score = LEAST(8.8, GREATEST(5.0, (reliability_score - 5) * 0.7 + 5)),
  efficiency_score = LEAST(8.8, GREATEST(5.0, (efficiency_score - 5) * 0.7 + 5)),
  cost_score       = LEAST(8.8, GREATEST(5.0, (cost_score - 5) * 0.7 + 5)),
  trust_score      = LEAST(8.8, GREATEST(5.0, (trust_score - 5) * 0.7 + 5)),
  overall_score    = LEAST(8.8, GREATEST(5.0, (overall_score - 5) * 0.7 + 5)),
  value_score      = CASE
    WHEN value_score IS NOT NULL THEN LEAST(8.8, GREATEST(5.0, (value_score - 5) * 0.7 + 5))
    ELSE NULL
  END
WHERE output_score IS NOT NULL;
