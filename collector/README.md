# Compass Collector — Claude Code hooks

Instrument your Claude Code agents in five minutes. A Stop hook captures every
run — model, tokens, latency — to a local JSONL; `ingest.py` loads it into
Compass. No SDK, no wrapper, no network calls: the collector writes only to
`~/.compass/` on your machine.

This is the live counterpart to `compass-cli` (repo root), which scans
`~/.claude/` retrospectively. The collector captures runs as they finish.

## 5-minute setup

```bash
# 1. Install the hook script (stdlib only, no deps)
mkdir -p ~/.claude/hooks
cp collector/claude_code_hooks/capture_run.py ~/.claude/hooks/

# 2. Register it — merge this into ~/.claude/settings.json
#    (see claude_code_hooks/settings_snippet.json for the exact block)
#    "hooks": { "Stop": [ { "hooks": [ { "type": "command",
#               "command": "python3 ~/.claude/hooks/capture_run.py" } ] } ] }

# 3. Use Claude Code normally. Each finished response appends a record:
tail ~/.compass/runs.jsonl

# 4. Load into Compass
python collector/ingest.py

# 5. Look at your fleet
streamlit run compass/app/app.py
```

No data yet? Try it on the committed sample first:

```bash
python collector/ingest.py collector/sample/runs.jsonl --db /tmp/compass_demo.db
```

## What gets captured

One record per agent per turn (subagent activity is split out as
`<project>/subagents`):

| field | meaning |
|---|---|
| `agent` | project directory name — your working definition of "an agent" |
| `model` | the model that produced the most output this turn |
| `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens` | raw usage, summed over the turn |
| `latency_ms` | first-to-last assistant message in the turn |
| `n_messages` | assistant messages in the turn |
| `status` | `ok` — the Stop hook fired, the turn finished |

How it works: Claude Code calls the hook with the session's transcript path;
the hook reads the transcript incrementally (a byte offset per session in
`~/.compass/collector_state.json`), so each run is captured exactly once and
a multi-hour session costs milliseconds to process. Failures exit silently —
telemetry never breaks a session.

## Honest limitations (prototype)

- **Cache pricing is simplified.** Ingest prices cache writes/reads as plain
  input tokens, which overstates the cost of cache-heavy sessions. Direction
  and ranking are right; the invoice is not.
- **`task_completed` is "the turn finished", not "the job succeeded".**
  Outcome detection (commits, tests, pushes) exists in `compass-cli`'s
  attribute stage and will fold in here.
- **Quality is NULL.** No fake numbers: quality scoring needs evals or human
  rating, and the dashboard says "—" until one exists.

## Architecture note

The collector is deliberately separable from the Compass app: it has no
imports from `compass/` (the hook is stdlib-only; only `ingest.py` touches
the pricing table and schema). Whether it ships as OSS (the Langfuse
playbook: open collector, paid intelligence) is an open question — nothing
here blocks either answer.

## Dogfooding

Compass's first real fleet is its own: point the collector at the machine
where Compass, Covant, and the other Claude Code projects get built, let it
run for a week, then open the dashboard. "This isn't a mockup — this is my
own agent fleet, instrumented with our collector in five minutes" is the
founder demo. `sample/runs.jsonl` is a synthetic preview of that shape.
