-- Verification requests table for agent X (Twitter) verification
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'x',
  x_handle TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_x_handle ON verification_requests(x_handle);

-- RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anon (the verify form)
CREATE POLICY "Allow anonymous inserts" ON verification_requests
  FOR INSERT WITH CHECK (true);

-- Only service role can read/update (for admin review)
CREATE POLICY "Service role can read all" ON verification_requests
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role can update" ON verification_requests
  FOR UPDATE USING (auth.role() = 'service_role');
