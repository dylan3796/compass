-- Compass — Agent ROI observability schema (SQLite)

CREATE TABLE IF NOT EXISTS Agent (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'research', 'email_drafting', 'classification', ...
  model TEXT NOT NULL,          -- 'claude-sonnet-4-6', 'gpt-4o', ...
  program TEXT,                 -- pipeline/workflow it belongs to
  status TEXT NOT NULL,         -- 'healthy', 'needs_attention', 'critical'
  created_at TIMESTAMP,
  last_run TIMESTAMP,
  -- Value assurance: what this agent was promised to cost/deliver when specced
  projected_cost_usd_mo REAL,   -- from the Opportunity Map spec (NULL = never projected)
  projected_value_usd_mo REAL,
  projection_source TEXT,       -- which spec/plan the projection came from
  -- Value measurement: how delivered value is estimated (NULL = not estimable)
  unit_value_usd REAL,          -- value per completed run
  value_basis TEXT              -- the assumption behind unit_value, in plain words
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
