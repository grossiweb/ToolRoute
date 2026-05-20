# Claudia VPS scripts — wire up migration notices

After migration `050_migration_notices.sql` is applied and the API redeploys,
every `/api/route` response can include a `notices` array (and optionally a
singular `migration_notice` for backward compat). Claudia's outreach and
reply scripts on the VPS need to extract and log these so we can act on
schema/payload changes without manual polling.

**Do not edit the VPS files from this repo.** This doc gives you the exact
commands to run on the VPS itself. SSH first:

```bash
ssh openclaw     # root@vmi3093213 per CLAUDE.md
```

## What changes

Each script currently extracts `request_id` from the routing response and
logs it. We're adding two extractions next to that one:

1. `migration_notice` (singular — present when exactly one notice applies)
2. `notices` (array — present when one or more notices apply)

If either is present, the script appends a one-line entry to a new log file
`/root/.openclaw/workspace/toolroute_notices.log` so we have an audit trail.

## The grep + sed update

Run this block on the VPS to patch both scripts in place. It's idempotent
— if you re-run it, the second run finds nothing to replace and leaves the
file alone.

```bash
for f in /root/.openclaw/workspace/moltbook_outreach.sh \
         /root/.openclaw/workspace/moltbook_reply.sh; do

  # 1. Locate the current extraction line for sanity.
  echo "=== $f — current request_id line ==="
  grep -n "route_data.get('request_id'" "$f" || echo "  (line not found — abort)"

  # 2. Insert two new extraction lines immediately AFTER the request_id one,
  #    plus an append-to-notices-log block. Uses a unique sed anchor so the
  #    insertion is exact and re-runnable.
  if grep -q "route_data.get('request_id', '')" "$f" \
     && ! grep -q "TOOLROUTE_NOTICE_INJECTED" "$f"; then
    sed -i "/route_data.get('request_id', '')/a\\
# TOOLROUTE_NOTICE_INJECTED — do not duplicate\\
migration_notice = route_data.get('migration_notice')\\
notices = route_data.get('notices', [])\\
if migration_notice or notices:\\
    import json as _json, datetime as _dt\\
    _log_line = _json.dumps({\\
        'ts': _dt.datetime.utcnow().isoformat() + 'Z',\\
        'script': '$(basename "$f")',\\
        'migration_notice': migration_notice,\\
        'notices': notices,\\
    })\\
    with open('/root/.openclaw/workspace/toolroute_notices.log', 'a') as _f:\\
        _f.write(_log_line + '\\\\n')" "$f"
    echo "  patched $f"
  else
    echo "  skipped $f (already patched or anchor missing)"
  fi
done

# 3. Show the new lines so you can eyeball them
echo "=== After-patch diff (last 20 lines around the anchor) ==="
for f in /root/.openclaw/workspace/moltbook_outreach.sh \
         /root/.openclaw/workspace/moltbook_reply.sh; do
  echo "--- $f ---"
  grep -A 12 "route_data.get('request_id'" "$f"
done
```

## Smoke test

After patching:

```bash
# Force one route call from the reply script's path so a notice — if any —
# lands in the new log file.
bash /root/.openclaw/workspace/moltbook_reply.sh 2>&1 | tail -20

# Check the notices log
ls -la /root/.openclaw/workspace/toolroute_notices.log 2>/dev/null \
  && tail -5 /root/.openclaw/workspace/toolroute_notices.log
```

If the two broadcast notices seeded by migration 050 are still active, you
should see at least one entry. If not, the log file simply won't exist yet
— that's also fine, it gets created on first non-empty notice.

## Rollback

If anything looks wrong, revert by removing the injected block:

```bash
for f in /root/.openclaw/workspace/moltbook_outreach.sh \
         /root/.openclaw/workspace/moltbook_reply.sh; do
  sed -i '/# TOOLROUTE_NOTICE_INJECTED/,/_f.write(_log_line/d' "$f"
done
```

## Why this lives in a doc and not in the repo

The VPS scripts are deployed artifacts — they don't live under git
control here, and editing them via repo tooling would require pushing
files to the VPS over SSH inside CI. Until we wire that up, the workflow
is: docs in repo, manual SSH apply.
