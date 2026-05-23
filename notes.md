# Compass CLI — Build Notes

Shared coordination document. **All teammates read this before starting work** and append updates as they go. Lead reconciles at each sync.

How to use:
- Before you start: read every section. Note the shape of what other teammates will produce/consume.
- While working: update your Status row. Append to Decisions if you make a non-obvious call. Update your Contract if your output shape changes.
- On handoff: write your one-liner to the next teammate.

---

## Status

| Teammate    | Owns             | Status        | Blocks on   | Last update |
|-------------|------------------|---------------|-------------|-------------|
| scanner     | `src/scan/`      | done          | —           | 2026-05-23  |
| classifier  | `src/classify/`  | done          | scanner     | 2026-05-23  |
| attributor  | `src/attribute/` | done          | scanner     | 2026-05-23  |
| pricer      | `src/pricing/`   | done          | classifier  | 2026-05-23  |
| renderer    | `src/render/`    | done          | —           | 2026-05-23  |

Status values: `not started` · `in progress` · `done` · `blocked` · `needs review`

_Last sync: 2026-05-23_

---

## Contracts (data shapes between teammates)

The JSON shapes flowing through the pipeline. **Update this when you change your output format** — every downstream teammate depends on it.

### scanner → `data/raw.json`
```ts
type ScannerOutput = {
  claudeHome: string;
  settings: object | null;
  projects: Array<{
    id: string;          // hash / dir name
    workingDir: string;
    claudeMd: string | null;
    mcpConfig: object | null;
    slashCommands: string[];  // names of .claude/commands/*.md
    subagents: string[];      // names of .claude/agents/*.md
    sessionIds: string[];
  }>;
  sessions: Array<{
    id: string;
    projectId: string;
    model: string;
    startedAt: string;
    endedAt: string;
    tokens: { input: number; output: number; cacheRead?: number; cacheWrite?: number };
    stopReason: string;
    transcriptPath: string;   // path to raw session file
  }>;
};
```

### classifier → `data/agents.json`
```ts
type ClassifierOutput = {
  agents: Array<{
    id: string;                  // matches scanner project id
    name: string;                // from CLAUDE.md frontmatter or dir basename
    purpose: string | null;      // CLAUDE.md first paragraph
    builtInToolsObserved: string[];   // ["Bash", "Edit", "Read", ...]
    mcpServers: Array<{ name: string; tools: string[] }>;
    slashCommands: string[];
    subagents: string[];
    sessionCount: number;
    modelBreakdown: Record<string, number>;  // {"claude-opus-4-7": 12, "claude-sonnet-4-6": 3}
    tokens: { input: number; output: number };
    lastUsed: string;
  }>;
};
```

### attributor → `data/outcomes.json`
```ts
type AttributorOutput = {
  byAgent: Record<string, {  // keyed by agent id
    commits: number;
    pushes: number;
    filesChanged: number;
    testsPassed: number;
    mcpActions: Record<string, Record<string, number>>;  // {server: {tool: count}}
    sessions: Array<{
      id: string;
      outcomes: string[];   // ["committed", "pushed", "wrote 4 files"]
      selfSummary: string;
      completion: "clean" | "interrupted";
    }>;
  }>;
};
```

### pricer → `data/costs.json`
```ts
type PricerOutput = {
  byAgent: Record<string, { totalUsd: number; sessions: Record<string, number> }>;
  byModel: Record<string, { tokens: number; usd: number }>;
  totalUsd: number;
};
```

### renderer input (assembled by lead) → final report
```ts
type ReportData = {
  generatedAt: string;
  totals: { agents: number; sessions: number; outcomes: number; usd: number };
  agents: Array<
    ClassifierOutput["agents"][0] &
    { outcomes: AttributorOutput["byAgent"][string] } &
    { cost: PricerOutput["byAgent"][string] }
  >;
};
```

---

## Decisions log

When you make a non-obvious technical decision, append it here so others can follow your reasoning.

- [2026-05-23, lead] Built as single-pass pipeline in plain JS (ES modules, no build step). No TypeScript — ships faster, npx-friendly.
- [2026-05-23, scanner] Use `sessions-index.json` `projectPath` or transcript `cwd` for real paths instead of decoding dir names (lossy `-` encoding).
- [2026-05-23, scanner] Collapse worktree dirs back to parent using `--claude-worktrees-` marker in dir name.
- [2026-05-23, classifier] Filter out 0-session agents (empty project dirs with no transcripts).
- [2026-05-23, attributor] Walk both top-level `.jsonl` and nested `subagents/` transcripts.
- [2026-05-23, renderer] Fonts as system fallback stack (Instrument Serif → Palatino → Georgia; Geist → SF Pro; JetBrains Mono → SF Mono) since external requests not allowed.
- [2026-05-23, pricer] MCP tool name parsing uses `lastIndexOf('__')` to handle multi-word server names like `claude_ai_Linear`.

---

## Fixtures

Hand-curated sample data so we can develop and test in parallel without depending on each other's output.

- `fixtures/claude-home-minimal/` — 2 projects, no MCP, ~10 sessions
- `fixtures/claude-home-mixed/` — 4 projects with SDR-flavored MCPs (Gmail, Salesforce, Linear)
- `fixtures/transcripts/` — extracted session transcripts with known outcomes for attributor unit tests

---

## Open questions

- [x] Path layout: `~/.claude/projects/<encoded-dir>/` with `sessions-index.json` and `*.jsonl` transcripts. Dirs with subagents have `<sessionId>/subagents/agent-*.jsonl`.
- [x] Transcript format: JSONL. Each line has `type` (user/assistant/file-history-snapshot). Assistant messages have `message.content[]` with `tool_use` blocks.
- [x] Tool names: PascalCase (`Bash`, `Read`, `Write`, `Edit`, etc). MCP: `mcp__<server>__<tool>`.
- [x] Zero-session projects: filtered out (no value to show).

---

## Handoffs

Write a one-liner when you mark your section `done`.

- **scanner → classifier, attributor**: done — `scan()` returns `{ claudeHome, settings, projects, sessions }`
- **classifier → pricer, renderer**: done — `classify()` returns `{ agents: [...] }`
- **attributor → renderer**: done — `attribute()` returns `{ byAgent: {...} }`
- **pricer → renderer**: done — `price()` returns `{ byAgent, byModel, totalUsd }`
- **renderer → lead**: done — `render()` returns self-contained HTML string

---

## Lead

Integration order:
1. scanner stable, schema-compliant JSON against both fixtures
2. classifier and attributor consume scanner output independently
3. pricer joins classifier output
4. Lead merges everything → ReportData → renderer
5. CLI wire-up in `bin/compass-cli.ts`
6. README + screenshot + `npm pack` dry-run

Release checklist:
- [x] All teammate sections marked `done`
- [x] All contracts in this file match what's actually emitted
- [x] `example-report.html` committed
- [x] README written (install, run)
- [x] `npm pack` produces a clean tarball (17.5 KB)
- [x] Tested on lead's own `~/.claude/` — 14 agents, 388 sessions, $9664, 2.0s
- [ ] Tested on a second machine

Post-ship:
- [ ] First 3 demo screenshots to send to prospects
- [ ] Issue tracker open for v1 (private repos, multi-machine, outcome integrations)