-- ToolRoute — Complete Benchmark Profiles + Metrics
-- Adds missing profiles and seeds benchmark_metrics for all profiles
-- Version: 1.2 | March 2026

-- ─────────────────────────────────────────────
-- ADD MISSING BENCHMARK PROFILES
-- ─────────────────────────────────────────────

INSERT INTO benchmark_profiles (slug, name, description, workflow_slug, category_scope) VALUES
  ('pdf-extraction-v1', 'PDF & Document Extraction v1', 'PDF parsing, table extraction, and structured output from complex documents.', 'data-analysis-reporting', 'data-extraction'),
  ('html-data-extraction-v1', 'HTML Data Extraction v1', 'Structured data extraction from web pages — pricing tables, product listings, contact info.', 'research-competitive-intelligence', 'data-extraction'),
  ('knowledge-base-search-v1', 'Knowledge Base Search v1', 'Enterprise knowledge retrieval across Notion, Confluence, Slack, and internal wikis.', 'knowledge-management', 'knowledge-retrieval'),
  ('analytics-query-v1', 'Analytics Query v1', 'Analytics and BI query generation — dashboards, metrics, and trend analysis.', 'data-analysis-reporting', 'analytics'),
  ('automation-task-execution-v1', 'Automation Task Execution v1', 'Multi-step workflow execution across integrated platforms.', 'executive-assistant-productivity', 'workflow-automation'),
  ('document-summary-retrieval-v1', 'Document Summary Retrieval v1', 'Document understanding, summarization, and key information extraction.', 'knowledge-management', 'document-intelligence')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- SEED BENCHMARK METRICS FOR ALL PROFILES
-- Each profile defines: metrics, scoring weights, success conditions
-- ─────────────────────────────────────────────

-- Web Research v1
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('source_accuracy', 'Source Accuracy', 0.25, true),
  ('extraction_completeness', 'Extraction Completeness', 0.25, true),
  ('response_latency', 'Response Latency', 0.15, false),
  ('cost_per_query', 'Cost per Query', 0.15, false),
  ('structured_output_quality', 'Structured Output Quality', 0.20, true)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'web-research-profile-v1';

-- Browser Task Completion v1
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('task_success_rate', 'Task Success Rate', 0.30, true),
  ('navigation_accuracy', 'Navigation Accuracy', 0.20, true),
  ('form_fill_accuracy', 'Form Fill Accuracy', 0.20, true),
  ('execution_latency', 'Execution Latency', 0.15, false),
  ('error_recovery', 'Error Recovery', 0.15, true)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'browser-task-completion-v1';

-- Repo Q&A v1
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('answer_accuracy', 'Answer Accuracy', 0.30, true),
  ('code_context_relevance', 'Code Context Relevance', 0.25, true),
  ('response_completeness', 'Response Completeness', 0.20, true),
  ('latency', 'Latency', 0.10, false),
  ('hallucination_rate', 'Hallucination Rate', 0.15, false)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'repo-qa-profile-v1';

-- Database Query Analysis v1 (≈ sql_query_generation)
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('query_correctness', 'Query Correctness', 0.30, true),
  ('schema_awareness', 'Schema Awareness', 0.20, true),
  ('result_accuracy', 'Result Accuracy', 0.20, true),
  ('query_efficiency', 'Query Efficiency', 0.15, true),
  ('cost_per_query', 'Cost per Query', 0.15, false)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'database-query-analysis-v1';

-- CRM Enrichment v1
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('field_accuracy', 'Field Accuracy', 0.30, true),
  ('field_coverage', 'Field Coverage', 0.25, true),
  ('enrichment_latency', 'Enrichment Latency', 0.15, false),
  ('data_freshness', 'Data Freshness', 0.15, true),
  ('cost_per_record', 'Cost per Record', 0.15, false)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'crm-enrichment-v1';

-- Publishing Workflow v1
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('format_accuracy', 'Format Accuracy', 0.25, true),
  ('content_fidelity', 'Content Fidelity', 0.25, true),
  ('cms_handoff_success', 'CMS Handoff Success', 0.25, true),
  ('latency', 'Latency', 0.10, false),
  ('human_correction_burden', 'Human Correction Burden', 0.15, false)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'publishing-workflow-v1';

-- Ticket Triage v1
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('classification_accuracy', 'Classification Accuracy', 0.30, true),
  ('routing_precision', 'Routing Precision', 0.25, true),
  ('priority_accuracy', 'Priority Accuracy', 0.20, true),
  ('response_time', 'Response Time', 0.15, false),
  ('false_escalation_rate', 'False Escalation Rate', 0.10, false)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'ticket-triage-v1';

-- E-commerce Catalog Extraction v1
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('field_extraction_accuracy', 'Field Extraction Accuracy', 0.30, true),
  ('product_coverage', 'Product Coverage', 0.25, true),
  ('price_accuracy', 'Price Accuracy', 0.20, true),
  ('extraction_speed', 'Extraction Speed', 0.10, true),
  ('structured_output_valid', 'Structured Output Valid', 0.15, true)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'ecommerce-catalog-extraction-v1';

-- PDF Extraction v1 (NEW)
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('text_extraction_accuracy', 'Text Extraction Accuracy', 0.25, true),
  ('table_parsing_accuracy', 'Table Parsing Accuracy', 0.25, true),
  ('layout_preservation', 'Layout Preservation', 0.20, true),
  ('processing_speed', 'Processing Speed', 0.15, true),
  ('structured_output_quality', 'Structured Output Quality', 0.15, true)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'pdf-extraction-v1';

-- HTML Data Extraction v1 (NEW)
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('field_extraction_accuracy', 'Field Extraction Accuracy', 0.30, true),
  ('schema_adherence', 'Schema Adherence', 0.20, true),
  ('dynamic_content_handling', 'Dynamic Content Handling', 0.20, true),
  ('extraction_speed', 'Extraction Speed', 0.15, true),
  ('cost_per_page', 'Cost per Page', 0.15, false)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'html-data-extraction-v1';

-- Knowledge Base Search v1 (NEW)
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('retrieval_relevance', 'Retrieval Relevance', 0.30, true),
  ('cross_platform_coverage', 'Cross-Platform Coverage', 0.20, true),
  ('answer_accuracy', 'Answer Accuracy', 0.25, true),
  ('search_latency', 'Search Latency', 0.15, false),
  ('permission_awareness', 'Permission Awareness', 0.10, true)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'knowledge-base-search-v1';

-- Analytics Query v1 (NEW)
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('query_correctness', 'Query Correctness', 0.30, true),
  ('insight_quality', 'Insight Quality', 0.25, true),
  ('visualization_readiness', 'Visualization Readiness', 0.15, true),
  ('execution_speed', 'Execution Speed', 0.15, true),
  ('cost_efficiency', 'Cost Efficiency', 0.15, false)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'analytics-query-v1';

-- Automation Task Execution v1 (NEW)
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('task_completion_rate', 'Task Completion Rate', 0.30, true),
  ('step_accuracy', 'Step Accuracy', 0.25, true),
  ('integration_breadth', 'Integration Breadth', 0.15, true),
  ('execution_reliability', 'Execution Reliability', 0.20, true),
  ('error_handling', 'Error Handling', 0.10, true)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'automation-task-execution-v1';

-- Document Summary Retrieval v1 (NEW)
INSERT INTO benchmark_metrics (benchmark_profile_id, metric_slug, metric_name, weight, is_higher_better)
SELECT bp.id, m.slug, m.name, m.weight, m.higher_better FROM benchmark_profiles bp,
(VALUES
  ('summary_accuracy', 'Summary Accuracy', 0.30, true),
  ('key_info_extraction', 'Key Information Extraction', 0.25, true),
  ('document_coverage', 'Document Coverage', 0.20, true),
  ('processing_speed', 'Processing Speed', 0.15, true),
  ('hallucination_rate', 'Hallucination Rate', 0.10, false)
) AS m(slug, name, weight, higher_better)
WHERE bp.slug = 'document-summary-retrieval-v1';

-- ─────────────────────────────────────────────
-- ADD TELEMETRY RATE TRACKING TABLE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemetry_rate_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  total_recommendations INT NOT NULL DEFAULT 0,
  total_reported_runs INT NOT NULL DEFAULT 0,
  telemetry_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  by_workflow_json JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_rate_period ON telemetry_rate_tracking(period_start);
