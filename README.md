# compass-cli

> **Also in this repo:** [`compass/`](compass/README.md) — demo/pitch assets
> (landing page + internal Streamlit dashboard with the Veritas AI demo
> scenario, all dummy data). The CLI below is the product; all product
> effort goes here until it has organic users.

Scan your `~/.claude/` directory and generate a self-contained HTML report showing what your Claude Code agents shipped.

## What you get

- **Agents grouped by project** — collapsed across worktrees
- **Tools observed** — built-in (Read, Edit, Bash, ...) and MCP servers
- **Outcome attribution** — commits, pushes, PRs opened/merged, files changed, tests passed, MCP actions
- **Cost estimation** — tokens × model pricing, including cost per merged PR
- **Recommendations** — rule-based detectors for context bloat, incomplete sessions, outcome efficiency vs. the fleet's best performer, and session bursts, with estimated savings
- **Session summaries** — completion status, outcome chips, last assistant text

## Install

```bash
npm install -g compass-cli
```

Or run directly:

```bash
npx compass-cli scan
```

## Usage

```bash
compass-cli scan                    # generates compass-report.html and opens it
compass-cli scan --out report.html  # custom output path
```

The report opens automatically in your default browser. Runs in ~2 seconds.

## How it works

1. **Scanner** walks `~/.claude/projects/`, `settings.json`, sessions, and subagent transcripts
2. **Classifier** groups projects by working directory, extracts tool/model/token metadata
3. **Attributor** parses transcript JSONL for `git commit`, `git push`, `gh pr create`/`gh pr merge` (plus the GitHub MCP equivalents), `Write`/`Edit` targets, test runner output, and MCP tool calls
4. **Pricer** estimates USD cost from token counts × model pricing (editable in `src/pricing/models.json`)
5. **Recommender** runs four fleet-relative detectors — trim context, add guardrail, clone best performer, loop burst — and estimates savings at API rates
6. **Renderer** emits one self-contained HTML file — inline CSS, no external requests

## Requirements

- Node.js 18+
- `~/.claude/` directory (created by Claude Code)

## Local-only

No data leaves your machine. No server, no upload, no auth. Everything runs locally against your filesystem.
