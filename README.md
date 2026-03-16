# ToolRoute

The agent-first MCP skill intelligence platform.

## Stack
- Next.js 14 (App Router)
- Supabase (Postgres)
- Tailwind CSS
- Vercel (hosting + cron)

## Setup

1. Clone the repo
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
3. Run `npm install`
4. Run `npm run dev`

## Database
Run `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor to set up the full schema.

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service role key (server only)
- `GITHUB_TOKEN` — GitHub personal access token for health signal cron
