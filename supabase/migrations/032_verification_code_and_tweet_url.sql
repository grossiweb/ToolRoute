-- Migration 032: Add verification_code and tweet_url to verification_requests
-- Enables MoltBook-style auto-verification when human pastes tweet URL

ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS tweet_url TEXT;
