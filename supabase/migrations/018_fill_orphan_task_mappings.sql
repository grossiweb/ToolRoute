-- ─────────────────────────────────────────────────────────────
-- Migration 018: Fill orphan tasks with tool mappings
--
-- Problem: Several tasks from migration 008 were created but never
-- received skill_tasks mappings, leaving them empty on the site.
-- Orphan tasks: translate-text, generate-speech, generate-images,
--   caption-images, detect-sentiment, review-contracts, manage-inventory
-- ─────────────────────────────────────────────────────────────

INSERT INTO skill_tasks (skill_id, task_id, relevance_score)
SELECT s.id, ta.id, v.rel FROM (VALUES
  -- ───── Translate Text ─────
  -- Translation benefits from search (context lookup), knowledge tools, and content platforms
  ('brave-search-mcp',    'translate-text', 7.5),   -- search for terminology/context
  ('exa-mcp-server',      'translate-text', 7.0),   -- semantic search for reference text
  ('context7',            'translate-text', 8.0),    -- docs and context for translation APIs
  ('notion-mcp-server',   'translate-text', 7.0),    -- read/write translated content
  ('confluence-mcp',      'translate-text', 6.5),    -- enterprise doc translation
  ('obsidian-mcp',        'translate-text', 6.5),    -- personal knowledge base translation
  ('gmail-mcp',           'translate-text', 7.0),    -- translate emails
  ('slack-mcp',           'translate-text', 6.5),    -- translate messages
  ('wordpress-mcp',       'translate-text', 7.5),    -- translate website content
  ('ghost-mcp',           'translate-text', 7.0),    -- translate blog posts
  ('sanity-mcp',          'translate-text', 7.0),    -- translate CMS content

  -- ───── Generate Speech (Text-to-Speech) ─────
  ('genai-toolbox',       'generate-speech', 8.5),   -- primary AI generation tool
  ('context7',            'generate-speech', 7.0),   -- docs for TTS APIs
  ('brave-search-mcp',    'generate-speech', 6.0),   -- research voice options

  -- ───── Generate Images ─────
  ('genai-toolbox',       'generate-images', 9.0),   -- primary AI generation
  ('context7',            'generate-images', 7.5),   -- docs for image gen APIs
  ('figma-context-mcp',   'generate-images', 7.0),   -- design context for generation
  ('brave-search-mcp',    'generate-images', 6.5),   -- reference image research
  ('wordpress-mcp',       'generate-images', 6.5),   -- publish generated images
  ('sanity-mcp',          'generate-images', 6.5),   -- CMS image management

  -- ───── Caption Images ─────
  ('genai-toolbox',       'caption-images', 8.5),    -- AI-powered captioning
  ('context7',            'caption-images', 7.0),    -- docs for vision APIs
  ('figma-context-mcp',   'caption-images', 7.0),    -- read design assets for captioning
  ('wordpress-mcp',       'caption-images', 7.0),    -- update image alt text
  ('sanity-mcp',          'caption-images', 7.0),    -- CMS image metadata

  -- ───── Detect Sentiment ─────
  ('genai-toolbox',       'detect-sentiment', 8.5),  -- AI analysis
  ('context7',            'detect-sentiment', 7.0),  -- NLP API docs
  ('zendesk-mcp',         'detect-sentiment', 8.0),  -- customer ticket sentiment
  ('intercom-mcp',        'detect-sentiment', 8.0),  -- chat/support sentiment
  ('hubspot-mcp',         'detect-sentiment', 7.5),  -- CRM interaction sentiment
  ('slack-mcp',           'detect-sentiment', 7.0),  -- team communication tone
  ('gmail-mcp',           'detect-sentiment', 7.0),  -- email sentiment analysis

  -- ───── Classify Text ─────
  ('genai-toolbox',       'classify-text', 8.5),     -- AI classification
  ('context7',            'classify-text', 7.0),     -- NLP/ML API docs
  ('zendesk-mcp',         'classify-text', 8.0),     -- ticket classification
  ('intercom-mcp',        'classify-text', 7.5),     -- support message routing
  ('linear-mcp',          'classify-text', 7.0),     -- issue categorization
  ('hubspot-mcp',         'classify-text', 7.0),     -- lead/contact classification

  -- ───── Review Contracts ─────
  ('context7',            'review-contracts', 7.5),  -- legal doc reference
  ('brave-search-mcp',    'review-contracts', 7.0),  -- legal research
  ('exa-mcp-server',      'review-contracts', 7.0),  -- semantic legal search
  ('docusign-mcp',        'review-contracts', 9.0),  -- contract management
  ('legalforce-mcp',      'review-contracts', 9.0),  -- legal analysis
  ('courtlistener-mcp',   'review-contracts', 8.0),  -- case law reference
  ('notion-mcp-server',   'review-contracts', 6.5),  -- contract storage
  ('confluence-mcp',      'review-contracts', 6.5),  -- enterprise legal docs

  -- ───── Manage Inventory ─────
  ('shopify-mcp',         'manage-inventory', 9.0),  -- e-commerce inventory
  ('woocommerce-mcp',     'manage-inventory', 8.5),  -- WooCommerce stock
  ('amazon-seller-mcp',   'manage-inventory', 8.5),  -- Amazon inventory
  ('quickbooks-mcp',      'manage-inventory', 7.5),  -- financial inventory tracking
  ('supabase-mcp',        'manage-inventory', 7.0),  -- database for inventory data
  ('neon-mcp',            'manage-inventory', 7.0),  -- database queries
  ('stripe-mcp',          'manage-inventory', 6.5)   -- payment/product catalog
) AS v(skill_slug, task_slug, rel)
JOIN skills s ON s.slug = v.skill_slug
JOIN tasks ta ON ta.slug = v.task_slug
ON CONFLICT DO NOTHING;
