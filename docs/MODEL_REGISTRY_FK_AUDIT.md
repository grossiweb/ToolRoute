# model_registry FK landmine — systematic audit (2026-06-08)

**Scope:** Tier-1 read-only audit. Reports and proposes only; nothing applied.

## TL;DR

The "uuid-vs-slug" bug is a **systematic incomplete migration**: the system moved
its model source-of-truth from the legacy `model_registry` table (uuid PK) to the
`models` catalog (text-slug PK, migration 043). Every column that still FK-references
`model_registry(id)` is a potential landmine when a handler writes a `models` slug
into it.

**There are exactly 3 such FK columns. All 3 are accounted for. None is currently BROKEN:**

| # | table.column | classification | why |
|---|---|---|---|
| 1 | `model_outcome_records.model_id` | **FIXED** (was BROKEN) | 059 dropped NOT NULL + added `model_slug`; `report/model` + `verify/model` now write `model_slug` |
| 2 | `model_routing_decisions.recommended_model_id` | **FIXED** (was BROKEN) | 061 dropped NOT NULL + added `recommended_model_slug`; `route/model` now writes `recommended_model_slug` |
| 3 | `model_aliases.model_id` | **FINE / UNUSED** | no runtime writer; seeded only by migrations with real `model_registry` uuids; read-only at runtime |

**Conclusion: there is no 4th broken endpoint to fix.** The write-side landmine is
fully defused. The two telemetry FKs are already on the slug path; the only unfixed
FK (`model_aliases.model_id`) is dormant because the live tier→model mapping moved
into code (`src/lib/routing/tiers.ts`), leaving `model_aliases` a legacy, read-only,
correctly-seeded table.

The residual exposure is **read-side**, not write-side — see §4.

---

## 1. Every FK referencing model_registry

Source: migration `023_model_routing.sql`. A full-history grep confirms **no FK to
`model_registry` was added in any migration after 023** — these 3 are the complete set.

| table.column | definition | on delete |
|---|---|---|
| `model_aliases.model_id` | `UUID NOT NULL REFERENCES model_registry(id)` | CASCADE |
| `model_routing_decisions.recommended_model_id` | `UUID NOT NULL REFERENCES model_registry(id)` → **NULL-able after 061** | (none) |
| `model_outcome_records.model_id` | `UUID NOT NULL REFERENCES model_registry(id)` → **NULL-able after 059** | (none) |

> ⚠️ **Live-DB confirmation pending.** This list is migration-derived (authoritative for
> FK *creation*, and no later migration alters it). To confirm against the live schema,
> run — this is the one query that still needs DB access:
> ```sql
> SELECT tc.table_name, kcu.column_name
>   FROM information_schema.table_constraints tc
>   JOIN information_schema.key_column_usage kcu USING (constraint_name)
>   JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
>  WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='model_registry';
> ```

---

## 2 & 3. Writers to each FK column + classification

### `model_outcome_records.model_id` → FIXED (was BROKEN)

- **Writers:**
  - `src/app/api/report/model/route.ts:229` — `.insert({ model_slug: model.id, … })`
  - `src/app/api/verify/model/route.ts:267` — `.insert({ model_slug: model.id, … })`
  - Both resolve the model from `models` (`.eq('id', model_slug)`) and write the **text slug
    into `model_slug`**, never into the legacy uuid `model_id`.
- **History of the break:** before 059, the handler wrote the slug into `model_id` (uuid NOT
  NULL FK) → insert threw → `/api/report/model` 500, zero writes since 2026-04-23.
- **Status:** FINE. Legacy `model_id` retained NULL-able for the 219 historical rows; no
  longer written by any handler.

### `model_routing_decisions.recommended_model_id` → FIXED (was BROKEN)

- **Writer:** `src/app/api/route/model/route.ts:233` — `.insert({ …, recommended_model_slug: primary.id })`.
  `primary.id` is a `models` slug (candidate source switched model_registry → models at commit
  c5eac8f, 2026-05-20). Writes the slug into `recommended_model_slug`, not the uuid column.
- **History of the break:** the decision log is fire-and-forget; before 061 the slug went into
  `recommended_model_id` (uuid NOT NULL) → insert threw → swallowed by `.then()` → 200 returned,
  no row. Silently dead since 2026-05-20.
- **Status:** FINE. Legacy `recommended_model_id` NULL-able; 12,573 historical rows retain it.

### `model_aliases.model_id` → FINE / UNUSED

- **Writers (runtime):** NONE. Full grep of `src/**` for `model_aliases` returns only:
  - `src/app/models/page.tsx:23` — `.from('model_aliases').select(...)` (admin read)
  - `src/app/api/route/route.ts:492,518` — comments: *"Tier-to-model mapping lives in
    src/lib/routing/tiers.ts — no model_aliases query."*
- **Writers (migrations only):** 023/025/035/036/037 seed `model_id` via
  `(SELECT id FROM model_registry WHERE slug = …)` — i.e. **real model_registry uuids**, never
  a `models` slug.
- **Status:** FINE / UNUSED. The FK is intact (valid uuids), nothing writes a slug to it, and
  the runtime tier mapping bypasses the table entirely. Not AT-RISK by the stated definition
  (its candidate source is model_registry, not the models table).

---

## 4. The remaining landmine is READ-side (not a write-break)

The migration fixed the **writes** and repointed the **RPC** (060), but two UI reads still
join the legacy `model_registry` / read the legacy uuid `model_id`. For every row written
**after** 059/061, `model_id` is NULL — so these reads silently return null/undercount, not
errors:

| location | stale read | effect on post-migration rows |
|---|---|---|
| `src/app/agents/[id]/page.tsx:76` | `select('…, model_id, model_registry(display_name, provider)')` | model name/provider render **null** (model_id null → join null) |
| `src/app/models/page.tsx:39-44` | aggregates `outcomeMap[o.model_id]` from `model_outcome_records` | new telemetry **undercounted** (model_id null; should key on `model_slug`) |

Confirmed-correct readers (no action): `routing-memory.ts:53` reads `recommended_model_slug`;
`get_model_outcome_stats` reads `model_slug` (060); `route/model/route.ts:198` compares the
RPC's slug output to candidate slugs.

---

## Proposed fixes (apply nothing until approved)

**A. Write-side: nothing to do.** No FK column is currently BROKEN. The forward-only
`DROP NOT NULL + ADD <col>_slug text REFERENCES models(id)` pattern (059/061) is **not** needed
a third time — `model_aliases.model_id` has no slug-writer to unblock.

**B. Read-side repoint (recommended, forward-only, no schema change):**
1. `agents/[id]/page.tsx:76` — replace `model_id, model_registry(display_name, provider)` with
   `model_slug, models(display_name, provider)` (join the catalog the slug actually references).
2. `models/page.tsx:39-44` — key `outcomeMap` on `model_slug` instead of `model_id`.

These are pure handler/reader edits, same spirit as 060's RPC repoint, no migration.

**C. Optional legacy cleanup (separate task, not urgent):** once the read-side is repointed,
nothing but migration seeds and the dormant `model_aliases` table reference `model_registry`.
A future migration could drop the now-unused legacy uuid columns
(`model_outcome_records.model_id`, `model_routing_decisions.recommended_model_id`) and decide
whether `model_aliases` is retired or migrated to `models`. Forward-only, history-preserving;
out of scope here.

**D. Verification still owed:** run the `information_schema` query in §1 against the live DB to
confirm the FK set is exactly these 3 (migration-derived today).
