# Claudia VPS scripts — wire up model outcome telemetry

After every OpenRouter LLM call, Claudia should POST `/api/report/model` so
ToolRoute's routing layer learns from real production outcomes. Telemetry is
fire-and-forget — it must never block the script or raise.

**Do not edit the VPS files from this repo.** This doc gives you a Python
snippet to paste manually into the scripts on the VPS. The previous notices
patch was a `sed` script because it anchored on a single shared line; the
OpenRouter call site varies between the two scripts, so this one is a
manual paste.

SSH first:

```bash
ssh openclaw     # root@vmi3093213 per CLAUDE.md
```

## What gets reported

Per LLM call:

| Field | Source |
|---|---|
| `decision_id` | `route_data['routing_metadata']['decision_id']` (fallback: `route_data['request_id']`) |
| `model_slug` | The actual model OpenRouter served — from the OpenRouter response `model` field |
| `outcome_status` | `success` if the comment posted, `failure` if any exception was raised |
| `latency_ms` | Wall-clock around the OpenRouter request |
| `task_description` | The post title being commented on (or whatever task description fits) |
| `agent_identity_id` | `e0416284-a3f3-42c9-8765-2f44db84e86e` (Claudia's ToolRoute agent) |
| `human_correction_required` | `false` (Claudia is fully automated) |

## Step 1 — Helper function (paste once at the top of each script)

Both `moltbook_outreach.sh` and `moltbook_reply.sh` should get this helper.
Paste it near the other helper functions, after imports:

```python
def _report_toolroute_outcome(route_data, model_slug, outcome_status, latency_ms, task_description):
    """Fire-and-forget telemetry to ToolRoute. Never raises."""
    try:
        import requests
        decision_id = (
            (route_data or {}).get('routing_metadata', {}).get('decision_id')
            or (route_data or {}).get('request_id')
        )
        requests.post(
            'https://toolroute.io/api/report/model',
            json={
                'decision_id': decision_id,
                'model_slug': model_slug,
                'outcome_status': outcome_status,
                'latency_ms': latency_ms,
                'task_description': task_description,
                'agent_identity_id': 'e0416284-a3f3-42c9-8765-2f44db84e86e',
                'human_correction_required': False,
            },
            timeout=5,
        )
    except Exception:
        pass
```

## Step 2 — Wrap each OpenRouter call

Find the OpenRouter `requests.post(...)` call in each script and wrap it
like this. The existing payload, headers, and post-processing stay put — we
only add a timer around it and a `finally` that fires telemetry.

```python
import time as _t

_start_ms = int(_t.monotonic() * 1000)
_outcome = 'success'
_response_model = None
try:
    # ── existing OpenRouter request goes here ──
    or_response = requests.post(
        'https://openrouter.ai/api/v1/chat/completions',
        json={...},      # existing payload — unchanged
        headers={...},   # existing headers — unchanged
        timeout=30,
    )
    or_response.raise_for_status()
    or_json = or_response.json()
    _response_model = or_json.get('model')   # actual model OpenRouter served
    # ── existing post-processing (extract text, etc.) — unchanged ──
except Exception:
    _outcome = 'failure'
    raise
finally:
    _report_toolroute_outcome(
        route_data,
        model_slug      = _response_model or (route_data or {}).get('model_details', {}).get('slug'),
        outcome_status  = _outcome,
        latency_ms      = int(_t.monotonic() * 1000) - _start_ms,
        task_description= task_title,   # ← adapt to whatever variable holds the post title
    )
```

### Variables you need to wire in

- `route_data` — the dict from `/api/route` (already used to pick the
  model). If the script doesn't store it as a dict yet, capture it from the
  earlier `/api/route` response with `route_response.json()`.
- `task_title` — adapt to whatever the existing script calls the post-title
  variable (likely `parent_post['title']`, `post['title']`, or similar).

If a script handles multiple post titles per run (e.g. a reply loop), put
the `try/except/finally` block inside the loop so each call reports its
own outcome.

## Step 3 — Smoke test

Run one outreach manually:

```bash
bash /root/.openclaw/workspace/moltbook_outreach.sh 2>&1 | tail -30
```

Then verify the report landed on ToolRoute. Easiest from the local machine:

```bash
psql "$SUPABASE_DB_URL" -c "
  SELECT created_at, outcome_status, latency_ms, task_context, output_quality_rating
  FROM model_outcome_records
  WHERE agent_identity_id = 'e0416284-a3f3-42c9-8765-2f44db84e86e'
  ORDER BY created_at DESC
  LIMIT 5;
"
```

(Or run the same query via the Supabase MCP / SQL editor.)

You should see a row per LLM call from the outreach run, with the post
title in `task_context` and a real `latency_ms`.

## Rollback

Delete the `_report_toolroute_outcome` helper and unwrap the `try/finally`
around each OpenRouter call (keep the call itself, drop the timer and the
`finally` block).

## Why this is a manual paste and not a sed patch

Unlike the notices doc (which anchored on a single shared
`route_data.get('request_id', '')` line), the OpenRouter call site has
different surrounding code in each script — `sed -i` against an anchor we
can't see safely is fragile. Pasting the snippet by hand lets you verify
it lands at the right spot. Once both scripts are patched and the smoke
test passes, future telemetry-shape changes can be done via a smaller
`sed` against the now-shared `_report_toolroute_outcome(` anchor.
