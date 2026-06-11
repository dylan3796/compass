#!/usr/bin/env python3
"""Compass collector — Claude Code Stop hook.

Fires when Claude finishes responding. Reads the session transcript
incrementally (byte offset per session, so each run is captured once),
aggregates the turn into one record, and appends it to ~/.compass/runs.jsonl.

Stdlib only, no network, and it never breaks your session: any failure
exits 0 silently. Ingest into Compass with collector/ingest.py.

Record shape (one JSON object per line):
  ts, session_id, agent, cwd, model,
  input_tokens, cache_creation_input_tokens, cache_read_input_tokens,
  output_tokens, latency_ms, n_messages, status, source
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

COMPASS_DIR = Path.home() / ".compass"
RUNS_PATH = COMPASS_DIR / "runs.jsonl"
STATE_PATH = COMPASS_DIR / "collector_state.json"


def _load_state() -> dict:
    try:
        return json.loads(STATE_PATH.read_text())
    except Exception:
        return {}


def _agent_name(cwd: str, sidechain: bool) -> str:
    base = Path(cwd).name if cwd else "unknown"
    return f"{base}/subagents" if sidechain else base


def _parse_ts(ts: str):
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return None


def capture(hook_input: dict) -> list[dict]:
    transcript = Path(hook_input.get("transcript_path", ""))
    session_id = hook_input.get("session_id", "unknown")
    # Session-level cwd, not per-record: shell `cd` inside a session must not
    # split one agent into many.
    session_cwd = hook_input.get("cwd", "")
    if not transcript.is_file():
        return []

    state = _load_state()
    offset = int(state.get(session_id, {}).get("offset", 0))
    size = transcript.stat().st_size
    if offset > size:  # transcript rotated/replaced — start over
        offset = 0

    # turns[(agent, sidechain)] -> aggregate for everything since the last Stop
    turns = {}
    with open(transcript, "rb") as f:
        f.seek(offset)
        for raw in f:
            try:
                rec = json.loads(raw)
            except Exception:
                continue
            if rec.get("type") != "assistant":
                continue
            msg = rec.get("message") or {}
            usage = msg.get("usage") or {}
            if not usage:
                continue
            cwd = session_cwd or rec.get("cwd", "")
            key = _agent_name(cwd, bool(rec.get("isSidechain")))
            t = turns.setdefault(key, dict(
                input_tokens=0, cache_creation_input_tokens=0,
                cache_read_input_tokens=0, output_tokens=0,
                n_messages=0, models={}, first_ts=None, last_ts=None,
                cwd=cwd))
            t["input_tokens"] += usage.get("input_tokens") or 0
            t["cache_creation_input_tokens"] += usage.get("cache_creation_input_tokens") or 0
            t["cache_read_input_tokens"] += usage.get("cache_read_input_tokens") or 0
            t["output_tokens"] += usage.get("output_tokens") or 0
            t["n_messages"] += 1
            model = msg.get("model") or "unknown"
            t["models"][model] = t["models"].get(model, 0) + (usage.get("output_tokens") or 0)
            ts = _parse_ts(rec.get("timestamp", ""))
            if ts:
                t["first_ts"] = min(t["first_ts"] or ts, ts)
                t["last_ts"] = max(t["last_ts"] or ts, ts)
        new_offset = f.tell()

    records = []
    now = datetime.now(timezone.utc).isoformat()
    for (key), t in turns.items():
        latency_ms = None
        if t["first_ts"] and t["last_ts"]:
            latency_ms = int((t["last_ts"] - t["first_ts"]).total_seconds() * 1000)
        records.append(dict(
            ts=now, session_id=session_id, agent=key, cwd=t["cwd"],
            model=max(t["models"], key=t["models"].get) if t["models"] else "unknown",
            input_tokens=t["input_tokens"],
            cache_creation_input_tokens=t["cache_creation_input_tokens"],
            cache_read_input_tokens=t["cache_read_input_tokens"],
            output_tokens=t["output_tokens"],
            latency_ms=latency_ms, n_messages=t["n_messages"],
            status="ok", source="claude_code_stop_hook"))

    COMPASS_DIR.mkdir(exist_ok=True)
    if records:
        with open(RUNS_PATH, "a") as out:
            for r in records:
                out.write(json.dumps(r) + "\n")
    state[session_id] = {"offset": new_offset, "updated": now}
    STATE_PATH.write_text(json.dumps(state, indent=1))
    return records


def main():
    try:
        hook_input = json.load(sys.stdin)
        capture(hook_input)
    except Exception:
        pass  # never break the session over telemetry
    sys.exit(0)


if __name__ == "__main__":
    main()
