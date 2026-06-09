# Phase 0 — Classification test battery results (2026-06-09)

75 queries (Sections 1-9 via `POST /api/route`, Section 10 via `POST /api/route/model`), run live
against production after the classifier was revived (model-id fix). Battery doc:
`docs/toolroute-classification-test-battery.md`.

## Headline
- **Intent classification is solved.** Do-vs-explain 21/21, adversarial traps 9/9, paraphrase pairs
  4/4 identical. The classifier understands intent and is phrasing-invariant.
- **The failure is entirely downstream:** ~13 coarse `tool_category` buckets → one workflow each →
  the workflow's top global `value_score` skill wins. The specifically-named tool is never consulted.

## Score by section
| Section | Strict ✅ | Lenient ✅+⚠️ | Pattern |
|---|---|---|---|
| 1 Web precision | 4/8 | 5/8 | browser-automation collapses to firecrawl; tavily→exa |
| 2 Business tools | 2/8 | 2/8 | CRM→salesforce (even Stripe), ticketing→gitlab |
| 3 Content/knowledge | 0/5 | 0/5 | cms→slack-mcp; notion/obsidian/context7 unsupported |
| 4 DevOps | 1/5 | 3/5 | right category, wrong tool (deployment→cloudflare, db→supabase) |
| 5 Direct LLM | 12/12 | 100% | perfect |
| 6 Adversarial | 9/9 | 100% | perfect |
| 7 Gaps | 3/6 gap-pass | — | 3 gap-FAIL (LinkedIn/WhatsApp→slack, Jira→gitlab) |
| 8 Paraphrase | 4/4 pairs identical | 100% | consistent even when wrong |
| 9 Compound | multi_tool 3/4 | — | primary correct 2/4 |
| 10 Tier path | 6/10 | 7/10 | misses limerick / Express API / Go race conditions |

## Per-query results (skill / approach / match_method / classification_method / confidence / tool_category)
Section 1: W1 firecrawl ✅ · W2 exa ✅ · W3 firecrawl ❌(JS automation) · W4 exa ⚠️(want tavily) ·
W5 firecrawl ✅ · W6 firecrawl ❌(screenshot) · W7 exa ✅ · W8 firecrawl ❌(automation). All `web_fetch`/`web_search`.
Section 2: B1 salesforce ✅ · B2 salesforce ❌(want hubspot) · B3 gitlab ❌(want zendesk) · B4 slack ❌(want shopify) ·
B5 salesforce ❌(want stripe!) · B6 salesforce ❌(want stripe) · B7 gitlab ❌(want zendesk) · B8 salesforce ✅.
Section 3: C1 slack ❌ · C2 slack ❌ · C3 slack ❌ · C4 supabase ❌ · C5 firecrawl ❌. (0/5)
Section 4: D1 cloudflare ⚠️(want aws) · D2 cloudflare ✅ · D3 cloudflare ❌(want terraform) · D4 gitlab ❌(want sentry) · D5 supabase ⚠️(want neon).
Section 5: L1-L12 all direct_llm / null ✅ (12/12).
Section 6: K1-K9 all direct_llm / null ✅ (9/9).
Section 7: G1 direct_llm 🔲 · G2 slack 🔴 · G3 slack 🔴 · G4 gitlab 🔴 · G5 direct_llm 🔲 · G6 direct_llm 🔲.
Section 8: P1a/P1b exa/exa ✅ · P2a/P2b supabase/supabase ✅ · P3a/P3b slack/slack (consistent, wrong tool) · P4a/P4b gitlab/gitlab (consistent, wrong tool). 4/4 pairs identical.
Section 9: M1 firecrawl (single) · M2 snyk (multi_tool; want sentry) · M3 supabase (multi_tool; want stripe) · M4 exa (multi_tool) ✅.
Section 10: T1 cheap_chat ✅ · T2 cheap_chat ❌(want creative) · T3 cheap_structured ✅ · T4 cheap_chat ❌(want fast_code) ·
T5 fast_code ⚠️ · T6 reasoning_pro ✅ · T7 cheap_chat ✅ · T8 best_available ✅ · T9 cheap_chat ✅ · T10 cheap_chat ❌(want reasoning_pro).

## Top 5 concerning
1. CRM bucket swallows everything incl. payments: "refund a Stripe payment" → salesforce-mcp @0.98.
2. Gap-fails assert adjacent wrong tools at 0.98-0.99 (WhatsApp/LinkedIn→slack, Jira→gitlab); the
   unresolved net never fires (it only catches "no category", not "confidently wrong category").
3. Content/notes 0/5 — `cms`→slack-mcp looks like a seeding bug (slack winning the content workflow).
4. Confidence uncalibrated: 0.98-0.99 on clearly wrong routes.
5. Tier path under-tiers expensive work: Go race-conditions and Express API → cheap_chat.

## Top 5 impressive
1. 21/21 do-vs-explain incl. 9/9 adversarial traps — real intent understanding.
2. 4/4 paraphrase pairs identical — phrasing-invariant (consistent even on mistakes).
3. Web scrape/search/live-data correctly split.
4. Multi-tool detection works (M2/M3/M4 flagged; sensible primaries for M1/M4).
5. Tier ladder nails clear cases (trivia→cheap_chat, structured, architecture→reasoning_pro, spec→best_available).

## Overarching insight (drives Phase 2)
The intent classifier is strong; the weak link is the **coarse taxonomy + category→single-workflow→
top-value_score-skill** resolution that ignores the named tool. Phase 2's value is **tool precision**,
not intent. A granular task layer (`tasks` + `skill_tasks` priors + `example_query`, currently dead in
the live path) with pgvector matching directly targets this. It must add a **calibrated confidence**
so the unresolved net can catch "confidently wrong category", not just "no category".
