# Tier Benchmark — model/tier routing eval

Gold tier labels for the AutoResearch loop. Each row is a verified-correct routing
decision captured during Priority 7. Run by `scripts/autoloop/run-benchmark.ts`.

Columns: `query | expected_tier | mode | notes`
- `mode = model` → `POST /api/route/model` (heuristic tier path), read top-level `tier`.
- `mode = route:<priority>` → `POST /api/route` with `constraints.priority=<priority>`,
  read `recommended_model.tier` (LLM-classifier tier path).

Tier CRS = 0.80·exact + 0.20·mean_partial (symmetric tier-ladder distance), so a
reasoning_pro↔best_available miss costs little; a cheap_chat↔best_available miss costs a lot.

## Group A — Heuristic path (`/api/route/model`)

| query | expected_tier | mode | notes |
|---|---|---|---|
| what is the capital of France | cheap_chat | model | factual Q&A |
| translate hello to Spanish | cheap_chat | model | translation |
| summarize this paragraph in one sentence | cheap_chat | model | summarization |
| tell me about Yellowstone national park | cheap_chat | model | P7 Q4 (tone in Yellowstone, fixed) |
| process this invoice and tell me the total | cheap_chat | model | P7 Q4 (voice in invoice, fixed) |
| give me an explanation of how photosynthesis works | cheap_chat | model | P7 Q4 (plan in explanation, fixed) |
| plan a birthday party for my kid | cheap_chat | model | plan pair / TRIVIAL_CONTEXT guard |
| plan a trip to Paris | cheap_chat | model | TRIVIAL_CONTEXT guard |
| extract these fields into a json object | cheap_structured | model | structured extraction |
| classify these support tickets as bug or feature | cheap_chat | model | cheap_chat acceptable for simple labeling; cheap_structured would require a structured-output keyword which risks false positives |
| parse this CSV and return the column names | cheap_structured | model | parsing |
| write a python function to reverse a linked list | fast_code | model | P7 positive |
| refactor this typescript class and fix the bug | fast_code | model | P7 positive |
| write a boilerplate Express REST API | fast_code | model | framework scaffold |
| write a haiku about the ocean | creative_writing | model | P7 positive |
| write compelling marketing copy for our landing page | creative_writing | model | P7 positive |
| write a cold outreach email to a client | creative_writing | model | persuasive |
| use mcp tools to fetch and orchestrate api calls | tool_agent | model | P7 positive |
| search the web for competitor pricing | tool_agent | model | web tool |
| analyze the architectural tradeoffs of this system design | reasoning_pro | model | P7 positive |
| plan the system architecture for a payments service | reasoning_pro | model | plan pair (no context word) |
| analyze the wedding budget | reasoning_pro | model | TRIVIAL_CONTEXT scoping (analyze holds) |
| diagnose the root cause of this memory leak | reasoning_pro | model | expert analysis |
| write a comprehensive technical specification for a payments platform | best_available | model | path-A keyword |
| write an exhaustive report on climate policy | best_available | model | P7 #2 scope cue |
| use the best possible model for an exhaustive market analysis | best_available | model | path-A |
| write code implementing a comprehensive analysis pipeline | best_available | model | P7 #2 intensity (signal_count>=2) |

## Group B — LLM path (`/api/route`, priority-dependent)

| query | expected_tier | mode | notes |
|---|---|---|---|
| write an in-depth comparative analysis of two economic theories | best_available | route:highest_quality | P7 #3 (analysis+complex @ highest_quality) |
| write a complex long-form essay analyzing the 2008 financial crisis | best_available | route:highest_quality | P7 #3 |
| write an in-depth comparative analysis of two economic theories | reasoning_pro | route:best_value | P7 #3 contrast — same query, best_value stays reasoning_pro |
