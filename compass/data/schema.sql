-- Compass — Agent ROI observability schema (SQLite)

CREATE TABLE IF NOT EXISTS Agent (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'research', 'email_drafting', 'classification', ...
  model TEXT NOT NULL,          -- 'claude-sonnet-4-6', 'gpt-4o', ...
  program TEXT,                 -- pipeline/workflow it belongs to
  purpose TEXT,                 -- plain-English: what this agent does and for whom
  task_noun TEXT,               -- what one run produces, e.g. 'document summary'
  status TEXT NOT NULL,         -- 'healthy', 'needs_attention', 'critical'
  created_at TIMESTAMP,
  last_run TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AgentRun (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES Agent(id),
  run_at TIMESTAMP NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_cost_usd REAL NOT NULL,
  latency_ms INTEGER NOT NULL,
  task_completed BOOLEAN NOT NULL,
  output_quality_score REAL,    -- 0-1, human-rated or heuristic
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_run_agent_time ON AgentRun(agent_id, run_at);

CREATE TABLE IF NOT EXISTS Recommendation (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES Agent(id),
  type TEXT NOT NULL,           -- 'trim_context', 'clone_prompt', 'add_guardrail', ...
  severity TEXT NOT NULL,       -- 'high', 'medium', 'low'
  description TEXT NOT NULL,
  detail TEXT,                  -- "how this was detected"
  estimated_savings_usd REAL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'applied', 'dismissed'
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Guardrail (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES Agent(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'max_tokens', 'output_validator', 'rate_limit', 'topic_filter', 'completion_checker'
  config JSON,
  active BOOLEAN NOT NULL DEFAULT 1,
  last_triggered TIMESTAMP,
  last_triggered_note TEXT,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AgentVersion (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES Agent(id),
  parent_version_id TEXT,
  label TEXT,
  prompt_snapshot TEXT,
  config_snapshot JSON,
  created_at TIMESTAMP,
  created_by TEXT
);
