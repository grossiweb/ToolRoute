# ToolRoute — Intense Classification Test Battery

**Purpose:** Surface weaknesses and validate value. Not just accuracy on obvious cases — this
battery is designed so failures are *informative* and passes are *meaningful*.

**Run via:** POST /api/route for skill tests; POST /api/route/model for tier tests.
**Capture per query:** recommended_skill, approach, match_method, classification_method,
confidence (if present), tool_category. Score against Expected column.

---

## Scoring Key

- ✅ Correct — matches expected
- ⚠️ Partial — plausible but not the best choice (e.g., right category, wrong specific tool)
- ❌ Wrong — clearly incorrect routing
- 🔲 Gap-pass — expected "unresolved", correctly returned low-confidence/null
- 🔴 Gap-fail — expected "unresolved", instead returned a confident wrong tool
- ➕ Bonus — routed better than expected (surfaces hidden capability)

---

## Section 1 — Tool precision within the web category (the hardest routing problem)

These queries all live in the web domain but need DIFFERENT tools. The system has firecrawl
(scraping/crawling), exa (AI search), brave-search (web search), tavily (research/answers),
browserbase and playwright (browser automation with JS support). Routing "web search" to firecrawl
or "JavaScript-heavy form automation" to exa is a failure even though both are "web tools."

| ID | Query | Expected skill | Expected approach | Test goal |
|----|-------|---------------|-------------------|-----------|
| W1 | scrape all product listings from this e-commerce page | firecrawl-mcp | mcp_server | Baseline scrape |
| W2 | find recent news articles about AI regulation in Europe | exa-mcp-server or brave-search-mcp | mcp_server | Search, not scrape |
| W3 | automate filling out a login form on this JavaScript-heavy site | playwright-mcp or browserbase-mcp | mcp_server | JS automation, not static scrape |
| W4 | research our top 5 competitors with cited sources and summaries | tavily-mcp | mcp_server | Deep research with answer extraction |
| W5 | check if my competitor added new pages to their sitemap | firecrawl-mcp | mcp_server | Crawl/monitor, not search |
| W6 | take a screenshot of this dashboard and describe it | playwright-mcp or browserbase-mcp | mcp_server | Browser automation with visual output |
| W7 | find the current exchange rate between USD and EUR | exa-mcp-server or brave-search-mcp | mcp_server | Live data lookup |
| W8 | navigate to this checkout flow and test all form validations | playwright-mcp or browserbase-mcp | mcp_server | Automation, not scrape |

---

## Section 2 — Business tool routing (CRM, commerce, support)

The system has salesforce, hubspot, zendesk, shopify, stripe. A common failure: routing ALL
business queries to "the business-y tool I've heard of" rather than the specific right one.

| ID | Query | Expected skill | Expected approach | Test goal |
|----|-------|---------------|-------------------|-----------|
| B1 | add a new lead to Salesforce | salesforce-mcp | mcp_server | Salesforce specifically |
| B2 | look up a contact's deal history in HubSpot | hubspot-mcp | mcp_server | HubSpot specifically |
| B3 | create a new support ticket in Zendesk | zendesk-mcp | mcp_server | Support tool routing |
| B4 | update product inventory for 3 SKUs in Shopify | shopify-mcp | mcp_server | Commerce tool routing |
| B5 | refund a customer's payment in Stripe | stripe-mcp | mcp_server | Payment tool routing |
| B6 | create a new Stripe subscription for this customer | stripe-mcp | mcp_server | Stripe write operation |
| B7 | list all open Zendesk tickets assigned to the team | zendesk-mcp | mcp_server | Support read operation |
| B8 | run a Salesforce SOQL report on Q2 pipeline | salesforce-mcp | mcp_server | CRM query |

---

## Section 3 — Content and knowledge management

Tests whether the system correctly routes to the right content or notes tool.

| ID | Query | Expected skill | Expected approach | Test goal |
|----|-------|---------------|-------------------|-----------|
| C1 | publish a new blog post with an image | wordpress-mcp | mcp_server | CMS routing |
| C2 | update a page on our Sanity CMS | sanity-mcp | mcp_server | Headless CMS routing |
| C3 | create a Notion page for the project brief | notion-mcp-server | mcp_server | Notes tool routing |
| C4 | search my Obsidian vault for notes on the Q3 launch | obsidian-mcp | mcp_server | Personal knowledge base |
| C5 | get the latest docs for Next.js version 15 | context7 | mcp_server | Docs retrieval |

---

## Section 4 — DevOps and cloud infrastructure

| ID | Query | Expected skill | Expected approach | Test goal |
|----|-------|---------------|-------------------|-----------|
| D1 | deploy a new Lambda function to AWS | aws-mcp | mcp_server | Cloud infra routing |
| D2 | update a Cloudflare DNS record for my domain | cloudflare-mcp | mcp_server | DNS / edge routing |
| D3 | apply a Terraform plan to provision new infrastructure | terraform-mcp | mcp_server | IaC routing |
| D4 | check Sentry for critical errors from the last hour | sentry-mcp | mcp_server | Error monitoring |
| D5 | create a Neon Postgres branch for staging | neon-mcp | mcp_server | Serverless Postgres |

---

## Section 5 — Direct LLM (the most important section)

These should ALL return approach: direct_llm. False positives here (routing to a tool when
none is needed) waste money and add latency. This section tests whether the system knows
when a tool is NOT the answer.

| ID | Query | Expected skill | Expected approach | Test goal |
|----|-------|---------------|-------------------|-----------|
| L1 | explain how Salesforce handles lead scoring | null | direct_llm | Explain, not execute |
| L2 | write SQL to find our top 10 customers by revenue | null | direct_llm | Write query, not execute it |
| L3 | what is the best way to structure a Shopify store? | null | direct_llm | Advice, not action |
| L4 | draft a reply to this Zendesk ticket complaint | null | direct_llm | Draft, not submit |
| L5 | review this Terraform config for security issues | null | direct_llm | Analysis, not deployment |
| L6 | explain what a Stripe webhook is | null | direct_llm | Knowledge question |
| L7 | write a Python script to process these CSV files | null | direct_llm | Code generation, not execution |
| L8 | proofread and improve this product description | null | direct_llm | Text editing |
| L9 | summarize the key points from this article | null | direct_llm | Summarization |
| L10 | what's the time complexity of quicksort? | null | direct_llm | Computer science knowledge |
| L11 | generate 10 name ideas for a fintech product | null | direct_llm | Creative generation |
| L12 | translate this paragraph to French | null | direct_llm | Translation |

---

## Section 6 — Adversarial keyword traps (designed to fool the classifier)

These queries contain NAMES of tool-associated platforms but the TASK is direct_llm. A naive
keyword classifier sees "Salesforce" and routes to salesforce-mcp even though the person is
asking a question, not triggering an action. This is the single most revealing weakness test.

| ID | Query | Expected skill | Expected approach | Test goal |
|----|-------|---------------|-------------------|-----------|
| K1 | I'm scraping a website — can you help me write the CSS selector? | null | direct_llm | "Scraping" as a topic, not a task |
| K2 | what Stripe API endpoint should I use to create a subscription? | null | direct_llm | Asking about Stripe, not using it |
| K3 | should I use HubSpot or Salesforce for our team of 10? | null | direct_llm | Comparison/advice |
| K4 | help me design a database schema for a Shopify-style platform | null | direct_llm | Design question, not Shopify action |
| K5 | what are best practices for Terraform state management? | null | direct_llm | Terraform knowledge, not apply |
| K6 | explain how Zendesk ticket routing works | null | direct_llm | Explain Zendesk, not use it |
| K7 | write a Slack message template for incident alerts | null | direct_llm | Write, not send |
| K8 | help me compose an email to a difficult client | null | direct_llm | Compose, not send |
| K9 | how should I organize my Notion workspace? | null | direct_llm | Advice about Notion, not action |

---

## Section 7 — True taxonomy gaps (graceful degradation)

The system should return low-confidence / unresolved for these, not confidently assert the wrong
tool. A confident wrong answer is worse than an honest "I don't know." This section measures
whether graceful degradation (from Section 3 of the fix) actually works.

| ID | Query | Expected skill | Expected approach | Test goal |
|----|-------|---------------|-------------------|-----------|
| G1 | post a tweet about our product launch | unresolved | low-confidence | No Twitter/X MCP |
| G2 | update our LinkedIn company page with the press release | unresolved | low-confidence | No LinkedIn MCP |
| G3 | send a WhatsApp message to the client | unresolved | low-confidence | No WhatsApp MCP |
| G4 | create a Jira ticket for this bug | unresolved | low-confidence | No Jira MCP (verify) |
| G5 | generate a Figma mockup for the new onboarding flow | unresolved | low-confidence | figma-context is read-only |
| G6 | record a walkthrough video of the new feature | unresolved | low-confidence | No screen recording MCP |

---

## Section 8 — Paraphrase robustness (same task, different wording)

These are pairs. The SAME underlying task should route to the SAME skill. Inconsistency here
reveals that the classifier is pattern-matching words rather than understanding intent.

| ID | Query | Expected skill | Notes |
|----|-------|---------------|-------|
| P1a | look up the latest news about Anthropic | exa or brave | Pair with P1b |
| P1b | what has Anthropic been up to recently? | exa or brave | Must match P1a |
| P2a | run this SQL query against the production database | supabase-mcp | Pair with P2b |
| P2b | execute this select statement in Postgres | supabase-mcp | Must match P2a |
| P3a | update the inventory count for product SKU-123 in Shopify | shopify-mcp | Pair with P3b |
| P3b | change the stock level of SKU-123 on Shopify | shopify-mcp | Must match P3a |
| P4a | create a support ticket for this customer complaint | zendesk-mcp | Pair with P4b |
| P4b | log a new Zendesk issue for this bug report | zendesk-mcp | Must match P4b |

---

## Section 9 — Compound tasks (what does the system do with multi-step needs?)

The right answer here is debatable. What matters is what the system DOES: does it pick the
primary tool, does it route to the "first step" tool, does it fall back to direct_llm? There's
no single correct answer, but the results reveal the system's implicit resolution strategy.

| ID | Query | Likely best primary | Notes |
|----|-------|---------------------|-------|
| M1 | scrape our competitor's pricing page and summarize the differences | firecrawl-mcp | Primary: scrape |
| M2 | check Sentry for errors from today and create a Zendesk ticket for each one | sentry-mcp | Two tools; which wins? |
| M3 | pull our Stripe revenue for this week and write a Notion summary | stripe-mcp | Data → content pipeline |
| M4 | find me five competitors using Exa and add them as leads in HubSpot | exa-mcp-server | Search → CRM pipeline |

---

## Section 10 — Model/tier path tests (via /api/route/model)

These test the SEPARATE tier/model classifier (detectTaskSignals + resolveModelTier). Note: this
endpoint uses a heuristic path, not the Gemini classifier, so it's testing different code.

| ID | Query | Expected tier | Notes |
|----|-------|--------------|-------|
| T1 | what is 2 + 2? | cheap_chat | Trivially simple |
| T2 | write me a limerick about coffee | creative_writing | Creative, short |
| T3 | format this JSON into a markdown table | cheap_structured | Structured transformation |
| T4 | write a boilerplate Express.js REST API with auth | fast_code | Standard code task |
| T5 | debug why this React component re-renders on every keystroke | tool_agent or reasoning_pro | Complex debugging |
| T6 | analyze this architecture for single points of failure | reasoning_pro | Deep analysis |
| T7 | translate "hello world" into 10 languages | cheap_chat | Simple, repetitive |
| T8 | write a comprehensive technical spec for a distributed caching layer | best_available | High-effort doc |
| T9 | what is the capital of France? | cheap_chat | Pure knowledge, zero effort |
| T10 | find every potential race condition in this 500-line Go service | reasoning_pro | Expert analysis |
