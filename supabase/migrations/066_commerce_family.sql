-- 066_commerce_family.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-10.
--
-- Phase 3 taxonomy: commerce family leaf tasks. Existing commerce tasks
-- (payment-processing, manage-inventory, ecommerce-management) cover charges +
-- inventory only; these 4 fill the distinct intents that had no owner — refunds,
-- order fulfillment, product catalog, and accounting/bookkeeping (lighting up the
-- under-used quickbooks/xero/brex skills). Skills already exist; this is coverage,
-- not new skills. Embeddings seeded separately (OpenRouter API).

INSERT INTO tasks (slug, name, description, example_query, display_order) VALUES
  ('process-refund', 'Process Refund',
   'Issue a refund for a customer payment or returned order through a payments or commerce platform.',
   'Refund a customer''s payment for a returned order', 103),
  ('order-management', 'Order Management',
   'Look up, update, and fulfill customer orders in an e-commerce or marketplace platform.',
   'Look up order #4821 and mark it as fulfilled', 104),
  ('product-catalog-management', 'Product Catalog Management',
   'Create and update product listings, prices, and descriptions in a store catalog.',
   'Add a new product with price and description to the store catalog', 105),
  ('accounting-bookkeeping', 'Accounting & Bookkeeping',
   'Reconcile transactions, manage invoices, and handle bookkeeping in an accounting platform.',
   'Reconcile this month''s transactions and create an invoice', 106)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO skill_tasks (task_id, skill_id, relevance_score)
SELECT t.id, s.id, v.rel
FROM (VALUES
  ('process-refund','stripe-mcp', 9.5),
  ('process-refund','square-mcp', 9.2),
  ('process-refund','shopify-mcp', 8.5),
  ('process-refund','brex-mcp', 7.0),
  ('order-management','shopify-mcp', 9.5),
  ('order-management','woocommerce-mcp', 9.0),
  ('order-management','amazon-seller-mcp', 9.0),
  ('order-management','square-mcp', 8.0),
  ('product-catalog-management','shopify-mcp', 9.5),
  ('product-catalog-management','woocommerce-mcp', 9.2),
  ('product-catalog-management','amazon-seller-mcp', 9.0),
  ('accounting-bookkeeping','quickbooks-mcp', 9.5),
  ('accounting-bookkeeping','xero-mcp', 9.2),
  ('accounting-bookkeeping','brex-mcp', 8.5),
  ('accounting-bookkeeping','plaid-mcp', 7.5)
) AS v(task_slug, skill_slug, rel)
JOIN tasks t ON t.slug = v.task_slug
JOIN skills s ON s.slug = v.skill_slug
ON CONFLICT (skill_id, task_id) DO NOTHING;
