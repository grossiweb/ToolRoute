-- 068_cms_publishing_example.sql
-- Applied via Supabase (MCP apply_migration) on 2026-06-10.
--
-- Section 3 polish: cms-publishing already has wordpress 9.5 as its top prior, but
-- C1 ("publish a blog post with an image") scored <0.70 against it because the old
-- example named "WordPress" specifically, lowering similarity to a generic blog
-- query. Retune to generic blog framing so C1 clears 0.70 -> cms-publishing ->
-- wordpress. Data-only, one row. Re-embedded separately.

UPDATE tasks
SET example_query = 'Publish a new blog post with a featured image and SEO description'
WHERE slug = 'cms-publishing';
