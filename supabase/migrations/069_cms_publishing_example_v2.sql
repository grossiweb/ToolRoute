-- 069_cms_publishing_example_v2.sql
-- Applied via Supabase (data-only UPDATE) on 2026-06-11.
--
-- Tighten cms-publishing's example to the C1 query shape. The 068 version
-- ("...with a featured image and SEO description") added tokens C1 doesn't have
-- ("publish a blog post with an image"), keeping C1 <0.70. Dropping the SEO tail
-- makes the example near-identical to C1 so it clears 0.70 -> wordpress (top prior).

UPDATE tasks
SET example_query = 'Publish a new blog post with a featured image'
WHERE slug = 'cms-publishing';
