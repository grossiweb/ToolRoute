# ToolRoute — Project Context for Claude

## What this project is

ToolRoute (originally NeoSkill) is an intelligent routing layer for AI agents. It tells agents which MCP server or model to use for a specific task, based on real execution data scored on output quality, reliability, efficiency, cost, and trust.

**Live at:** https://toolroute.io
**API docs:** https://toolroute.io/api/route
**Stack:** Next.js, Supabase, Vercel
**Status:** Launched, in active promotion phase

---

## Architecture

- `src/app/api/` — all API routes (Next.js route handlers)
- `src/app/` — pages and UI
- `src/lib/` — shared utilities, Supabase client
- `supabase/migrations/` — all DB schema + seed data (source of truth)
- `sdk/` — ToolRoute SDK

## Key API endpoints

```
GET  /api/route?task=...          Quick routing query
POST /api/route                   Full routing with constraints
POST /api/report                  Report execution outcome
POST /api/agents/register         Register agent identity
GET  /api/challenges              List all challenges
POST /api/challenges/submit       Submit challenge result
GET  /api/missions/available      List benchmark missions
POST /api/missions/complete       Submit mission result (4x credits)
POST /api/contributions           Advanced telemetry (A/B, fallback chains)
POST /api/mcp                     JSON-RPC MCP endpoint
GET  /api/admin/stats             Admin telemetry dashboard
```

---

## Scoring formula

Value Score = 0.35 x Quality + 0.25 x Reliability + 0.15 x Efficiency + 0.15 x Cost + 0.10 x Trust

---

## Database tables (key ones)

- `skills` — MCP server catalog
- `tasks` — atomic task types (web-search, web-scraping, code-review, etc.)
- `skill_tasks` — maps skills to tasks with relevance_score (THIS drives routing)
- `outcome_records` — real execution telemetry
- `workflow_challenges` — challenges catalog
- `challenge_submissions` — agent submissions
- `agent_identities` — registered agents
- `benchmark_profiles` — scoring rubrics per workflow type

---

## Current known issues

### Routing seeding is weak (top priority fix)

ToolRoute recommends `wordpress-mcp` (66% confidence) for tasks like "write a comment on an agent forum" because there is no task slug for social/forum writing — it falls back to `content-creation-publishing` workflow.

Root cause: `skill_tasks` has no entries for:
- Social/forum writing (no task slug exists)
- Forum comment generation (no task slug exists)
- Web research + synthesis (exists but needs better coverage)
- Email drafting (exists but sparse)

Fix: Run migration `030_agent_native_tasks_and_challenges.sql` — adds 6 new agent-native tasks, correct skill_task mappings, and 20 new challenges.

---

## Challenges

### Existing 15 (business workflows)
Categories: `finance`, `legal`, `dev-ops`, `marketing`, `sales`, `content`, `research`, `operations`, `customer-support`, `data`

DO NOT change these category names — agents may already be filtering by them.

### 20 new agent-native challenges (LIVE)
Migration `030_agent_native_tasks_and_challenges.sql` — run in Supabase ✅
API route updated with all 11 categories ✅

New categories use `agent-` prefix to distinguish from business workflows:
`agent-web`, `agent-code`, `agent-data`, `agent-communication`, `agent-research`, `agent-ops`

---

## Infrastructure (VPS)

Server: root@vmi3093213 (Contabo VPS)

Claudia (autonomous agent running on VPS):
- Moltbook account: claudia-grossiweb
- Agent ID: 0059e78b-5816-49d6-bbc7-19ba758674e8
- ToolRoute agent ID: e0416284-a3f3-42c9-8765-2f44db84e86e
- Outreach script: /root/.openclaw/workspace/moltbook_outreach.sh (9am + 9pm UTC)
- Reply script: /root/.openclaw/workspace/moltbook_reply.sh (every 10 min)
- Both scripts call toolroute.io/api/route before every OpenRouter call

Published packages:
- npm: @toolroute/hook@1.0.0 — OpenClaw hook, auto-routes every agent task
- ClawdHub: grossiweb/toolroute@1.0.1 — Skill for manual use (flagged suspicious by scanner — known, acceptable)

---

## Moltbook strategy

Platform: agent-only social network at moltbook.com
Claudia karma: 7 (stuck — comments alone do not earn karma)
Problem: 54 comments, only 2 posts. Need original posts.

What works: Honest operational reflections with real data, specific numbers, real experiments
What does not work: Product announcements, generic commentary

Planned posts:
1. "How would you build intelligent routing seeding from scratch?" — honest about primitive seeding, ask community
2. "Our ClawdHub skill gets flagged suspicious for calling external API on every task — right approach or smarter architecture?"

---

## Credit economy

- Run report: 3-10 credits
- With agent identity: 2x multiplier
- Fallback chain: 1.5x
- Comparative A/B eval: 2.5x
- Benchmark mission: 4x
- Challenge submission: 3x

---

## Next Steps (priority order)

### 1. Fix routing seeding (STILL BROKEN)
Migration 031 added workflows + skill_workflows but routing still returns wrong skills.
Test results (2026-03-24):
- "write a comment on an agent forum" → plaid-mcp (WRONG — should be slack/discord)
- "draft an email to a client" → figma-context-mcp (WRONG — should be gmail/sendgrid)
- "send a Slack message" → plaid-mcp (WRONG — should be slack-mcp)
Root cause under investigation — junction table filtering returns 0 matches, falls back to top-50 unfiltered.
Likely issue: workflow slugs in code don't match what's in DB, or skill_workflows rows weren't inserted.

### ~~2. Have Claudia run challenges~~ ✅ DONE (2026-03-24)
Claudia completed all 25 challenges (5 original + 20 agent-native). ~900 credits earned.
Mostly SILVER tier, multiple #1 rankings. One-submission-per-agent limit working.
Claudia is verified (trust_tier: trusted, 2x multiplier active).

### 3. Moltbook original posts
Claudia has 54 comments but only 2 posts. Karma stuck at 7. Need original posts to grow.
Strategy: NOT product announcements. Authentic operational reflections, controversial takes, or community questions.

### 4. Rethink ClawdHub skill strategy
Current: grossiweb/toolroute@1.0.1 flagged as suspicious by ClawdHub scanner (calls external API on every task).
Options to evaluate:
- Leave as-is and wait for organic usage to clear the flag
- Redesign to batch/cache routing calls instead of per-task
- Alternative distribution channels (direct MCP config is already working — is ClawdHub even needed?)

### 5. Seed first 5-10 external agents
Personal outreach to agent builders. Message: "routing layer for MCP servers — 5 min setup, agents earn credits."
Goal: 5 registered agents with at least 1 telemetry report each.

### 6. Community launch
- Twitter/X thread with live demo + MCP one-liner
- Reddit: r/ClaudeAI, r/ChatGPTPro, r/LocalLLaMA
- HackerNews: Show HN post
- Anthropic/OpenAI Discord channels
- Add ToolRoute to MCP server registry lists

### 7. Time-limited challenge event
Once there's baseline data from Claudia + a few external agents, run a 1-week competition event (e.g., "Web Scraping Showdown — best scraper wins 500 bonus credits") to drive engagement.

### 8. Verification UX improvements
- Auto-detect tweet (requires Twitter API $100/month) — currently human pastes URL manually
- OG image for link previews — static 1200x630 PNG at /public/og-image.png
- Agent notification on verification — currently surfaces in next /api/route call within 1 hour

### 9. Split `executive-assistant-productivity` workflow
Currently too broad — email, Slack, forums, PDFs, calendars all route here. Google Calendar wins everything because it has the highest value score among 14 skills. Need sub-workflows like:
- `communication-messaging` (Slack, Discord, Teams)
- `email-drafting` (Gmail, SendGrid, Mailchimp)
- `document-processing` (PDF tools, Markdown, Obsidian)
- `scheduling-calendar` (Google Calendar, Calendly, Todoist)

---

## Backlog — UI/UX improvements (come back to these later)

### Servers page — restore category sidebar
- We used to have a left column filtering by task type / industry / category — lost in a redesign
- Re-add sidebar with workflow and vertical filters
- Use same category structure as challenges

### Challenges page — add category filtering
- Challenges should be filterable by category (same structure as servers)
- Group by: agent-web, agent-code, agent-data, agent-communication, agent-research, agent-ops, plus business categories

### Models page — categorization
- Explore how to categorize models (by size, capability, cost tier, task type)
- Maybe same category structure where it makes sense

### Unified category architecture
- Servers, challenges, and (where applicable) models should use the SAME category taxonomy
- Good for UX consistency and SEO (people searching for specific workflows find all related content)
- Category pages could show: relevant servers + challenges + models for a given workflow

### Leaderboards — improve ranking system
- Used to show actual points awarded — now shows runs which is less meaningful
- Fix tab functionality
- Better ranking metrics (credits earned, challenge tiers, verification status)
- Add "Recent Activity" feed — show latest challenge completions, verifications, reports
- Add "Active Agents" section — who's been active in last 24h/7d

### Admin stats — activity monitoring
- Add "Latest Activity" feed (real-time recent events)
- Growth metrics: is platform getting more or less active over time
- Trend graphs: registrations, reports, challenges per day/week
- Active agent count (daily/weekly active)

---

## Next Steps — Priority Order

### NOW (In Progress)
- Claudia routes through ToolRoute visibly before every task (instructions sent)
- Claudia MoltBook outreach — engage with Hazel_OC, flowglad, MarchBot001 daily
- Claudia 7-day post series — 6 remaining posts queued (Hazel-inspired voice)
- Run migration 034 in Supabase ✅ DONE

### SOON (Next Wave)
- Build and publish @toolroute/hook on npm + ClawdHub (package doesn't exist yet — needs to be built from scratch)
- Syndicate ToolRoute MCP server to all directories — awesome-mcp lists, MCP registries, GitHub topics, npm, etc.
- GitHub stars campaign — make the repo discoverable, add badges, improve README for open-source appeal
- Post articles: Medium, Dev.to, Hashnode — "How I route my agent's tasks automatically" style content
- Direct outreach to MCP server creators — show ToolRoute improves their tool's discoverability
- Direct outreach to n8n/Make/Zapier automation builders — ToolRoute as a pre-routing step
- Direct outreach to OpenClaw skill developers — integration opportunities
- Contact agents/developers building other tools and show value proposition

### LATER (Explore)
- Validate routing quality vs base models — does ToolRoute recommendation outperform an agent just using Claude Opus for everything? Need real A/B test data
- DM strategy on MoltBook — direct messaging high-karma agents and builders
- Create m/tools or m/mcp-servers submolt on MoltBook — become the hub for tool discussion
- OpenRouter community integration — ToolRoute as a pre-routing layer for OpenRouter users
- Notion/public docs site for ToolRoute
- Trilingual content strategy (English, Italian, Spanish) for broader reach

### UI/UX Backlog
- Servers page: restore category sidebar with left column ✅ DONE (cross-links added)
- Challenges page: add category filtering ✅ DONE
- Models page: explore categorization (same structure as servers/challenges)
- Leaderboards: fix points display, add recent activity, show active agents
- Admin stats: real-time activity feed, growth metrics, platform health dashboard
- Consistent category structure across servers, challenges, and models for SEO
- Score compression to Consumer Reports style ✅ DONE (migration 034)

### Claudia (VPS) Backlog
- Update Claudia's MoltBook bio to trilingual
- Have Claudia install @toolroute/hook on her own VPS (once built)
- Claudia auto-comments on trending MoltBook posts daily
- Claudia engagement tracking — measure karma growth, follower growth, conversion to ToolRoute

## Rules — do not

- Do not change scoring formula weights without testing
- Do not add challenges without both description AND objective fields — both required
- Do not touch Claudia moltbook scripts without checking moltbook_posted.json and moltbook_replied.json first
- Do not change existing challenge category names — agents filter by them
- Do not set skill scores above 8.8 — Consumer Reports style: 8.5+ is excellent, 7.5+ is very good, nothing is perfect (migration 034)
- Do not set skill_tasks relevance scores above 8.5
