function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtUsd(n) {
  if (n >= 1000) return '$' + Math.round(n).toLocaleString('en-US');
  return '$' + n.toFixed(2);
}

function fmtTokens(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function modelShortName(model) {
  return model.replace(/^claude-/, '').replace(/-\d{8}$/, '').replace(/\[.*\]$/, '');
}

const MODEL_COLORS = {
  opus: '#B84A2E',
  sonnet: '#2E6B4A',
  haiku: '#2D4A7A',
};

function modelColor(model) {
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (model.includes(key)) return color;
  }
  return '#6B6B65';
}

function renderToolPills(tools) {
  return tools.map(t =>
    `<span class="tool-pill">${esc(t)}</span>`
  ).join('');
}

function renderMcpServers(servers) {
  if (!servers || servers.length === 0) return '';
  return servers.map(s =>
    `<div class="mcp-row">
      <span class="mcp-name">${esc(s.name)}</span>
      <span class="mcp-tools">${s.tools.map(t => esc(t)).join(', ')}</span>
    </div>`
  ).join('');
}

function renderModelBar(perModel) {
  const entries = Object.entries(perModel || {}).sort((a, b) => {
    const ta = a[1].input + a[1].output + a[1].cacheWrite + a[1].cacheRead;
    const tb = b[1].input + b[1].output + b[1].cacheWrite + b[1].cacheRead;
    return tb - ta;
  });
  if (entries.length === 0) return '<span class="text-muted">—</span>';

  const totalTokens = entries.reduce((s, [, d]) => s + d.input + d.output + d.cacheWrite + d.cacheRead, 0);

  return `<div class="model-bar">${entries.map(([model, data]) => {
    const tokens = data.input + data.output + data.cacheWrite + data.cacheRead;
    const pct = ((tokens / totalTokens) * 100).toFixed(0);
    return `<div class="model-seg" style="flex:${tokens};background:${modelColor(model)}" title="${esc(model)}: ${fmtTokens(tokens)} tokens (${pct}%)">
      <span class="model-lbl">${esc(modelShortName(model))}</span>
    </div>`;
  }).join('')}</div>`;
}

function renderOutcomeStats(outcomes) {
  if (!outcomes) return '<span class="text-muted">—</span>';
  const items = [];
  if (outcomes.commits > 0) items.push(`<span class="stat-n">${outcomes.commits}</span> commits`);
  if (outcomes.pushes > 0) items.push(`<span class="stat-n">${outcomes.pushes}</span> pushes`);
  if (outcomes.filesChanged > 0) items.push(`<span class="stat-n">${outcomes.filesChanged}</span> files`);
  if (outcomes.testsPassed > 0) items.push(`<span class="stat-n">${outcomes.testsPassed}</span> tests`);
  for (const [server, tools] of Object.entries(outcomes.mcpActions || {})) {
    const total = Object.values(tools).reduce((a, b) => a + b, 0);
    items.push(`<span class="stat-n">${total}</span> ${esc(server)}`);
  }
  if (items.length === 0) return '<span class="text-muted">—</span>';
  return items.join('<span class="dot-sep"> · </span>');
}

function renderSessionChips(sessions) {
  if (!sessions || sessions.length === 0) return '';
  const recent = sessions.slice(-5).reverse();
  return recent.map(s => {
    const icon = s.completion === 'clean' ? '●' : '○';
    const cls = s.completion === 'clean' ? 'comp-clean' : 'comp-int';
    const summary = s.selfSummary ? esc(s.selfSummary.slice(0, 180)) : '<em>no summary</em>';
    return `<div class="session-item">
      <div class="session-head">
        <span class="${cls}">${icon}</span>
        <span class="session-summary">${summary}</span>
      </div>
    </div>`;
  }).join('');
}

function renderAgentRow(agent, i, totalAgents) {
  const cost = agent.cost ? fmtUsd(agent.cost.totalUsd) : '$0';
  const cpo = agent.outcomes && agent.outcomes.commits + agent.outcomes.pushes + agent.outcomes.filesChanged > 0
    ? fmtUsd(agent.cost.totalUsd / (agent.outcomes.commits + agent.outcomes.pushes + agent.outcomes.filesChanged + agent.outcomes.testsPassed || 1))
    : '—';
  const lastUsed = timeAgo(agent.lastUsed);
  const borderBottom = i === totalAgents - 1 ? 'none' : '1px solid var(--border-soft)';
  const totalOutcomes = agent.outcomes
    ? agent.outcomes.commits + agent.outcomes.pushes + agent.outcomes.filesChanged + agent.outcomes.testsPassed
      + Object.values(agent.outcomes.mcpActions || {}).reduce((s, tools) => s + Object.values(tools).reduce((a, b) => a + b, 0), 0)
    : 0;

  return `
  <div class="agent-row row-hover" style="border-bottom:${borderBottom}" data-spend="${agent.cost?.totalUsd || 0}" data-outcomes="${totalOutcomes}" data-sessions="${agent.sessionCount}" data-name="${esc(agent.name)}">
    <div class="agent-icon" style="background:${modelColor(Object.keys(agent.modelBreakdown || {})[0] || '')}">
      <span>${esc(agent.name[0].toUpperCase())}</span>
    </div>
    <div class="agent-info">
      <div class="agent-name">${esc(agent.name)}</div>
      <div class="agent-path">${esc(agent.workingDir)}</div>
    </div>
    <div class="agent-cost tabular">${cost}</div>
    <div class="agent-outcomes tabular">${totalOutcomes}</div>
    <div class="agent-cpo tabular">${cpo}</div>
    <div class="agent-sessions tabular">${agent.sessionCount}</div>
    <div class="agent-last tabular">${lastUsed}</div>
  </div>
  <div class="agent-detail" id="detail-${i}">
    <div class="detail-grid">
      <div class="detail-section">
        <div class="label">TOOLS</div>
        <div class="tool-list">${renderToolPills(agent.builtInToolsObserved)}</div>
      </div>
      ${agent.mcpServers.length > 0 ? `
      <div class="detail-section">
        <div class="label">MCP SERVERS</div>
        ${renderMcpServers(agent.mcpServers)}
      </div>` : ''}
      <div class="detail-section">
        <div class="label">OUTCOMES</div>
        <div class="outcomes-line">${renderOutcomeStats(agent.outcomes)}</div>
      </div>
      <div class="detail-section">
        <div class="label">MODEL MIX</div>
        ${renderModelBar(agent.perModel)}
      </div>
      ${agent.outcomes?.sessions?.length > 0 ? `
      <div class="detail-section detail-full">
        <div class="label">RECENT SESSIONS</div>
        ${renderSessionChips(agent.outcomes.sessions)}
      </div>` : ''}
    </div>
  </div>`;
}

function renderSpendByModel(pricing) {
  if (!pricing) return '';
  const models = Object.entries(pricing.byModel).sort((a, b) => b[1].usd - a[1].usd);
  const maxUsd = models[0]?.[1].usd || 1;

  return models.map(([model, data]) => {
    const pct = (data.usd / maxUsd) * 100;
    return `<div class="spend-row">
      <span class="spend-model">${esc(modelShortName(model))}</span>
      <div class="spend-bar-wrap">
        <div class="spend-bar" style="width:${pct}%;background:${modelColor(model)}"></div>
      </div>
      <span class="spend-tokens tabular">${fmtTokens(data.tokens)}</span>
      <span class="spend-cost tabular">${fmtUsd(data.usd)}</span>
    </div>`;
  }).join('');
}

export function render(reportData) {
  const { totals, agents, pricing } = reportData;

  const totalMcpActions = agents.reduce((sum, a) => {
    return sum + Object.values(a.outcomes?.mcpActions || {}).reduce(
      (s, tools) => s + Object.values(tools).reduce((a, b) => a + b, 0), 0
    );
  }, 0);
  const totalCommits = agents.reduce((s, a) => s + (a.outcomes?.commits || 0), 0);
  const totalPushes = agents.reduce((s, a) => s + (a.outcomes?.pushes || 0), 0);
  const totalFiles = agents.reduce((s, a) => s + (a.outcomes?.filesChanged || 0), 0);
  const totalTests = agents.reduce((s, a) => s + (a.outcomes?.testsPassed || 0), 0);
  const avgCpo = totals.outcomes > 0 ? totals.usd / totals.outcomes : 0;

  const agentRows = agents.map((a, i) => renderAgentRow(a, i, agents.length)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Compass — Claude Code Fleet Report</title>
<style>
  @font-face { font-family: 'Instrument Serif'; src: local('Instrument Serif'), local('InstrumentSerif-Regular'); font-weight: 400; font-display: swap; }

  :root {
    --bg: #FAFAF7;
    --surface: #FFFFFF;
    --ink: #0A0A0A;
    --ink70: #3A3A36;
    --muted: #6B6B65;
    --muted-soft: #9A988F;
    --muted-bg: #F2F1EA;
    --border: #E5E3DC;
    --border-soft: #EEEDE6;
    --border-strong: #D4D2C8;
    --brand: #1A4D3E;
    --brand-soft: #E8EFEB;
    --rust: #B84A2E;
    --rust-soft: #FBEDE6;
    --green: #2E6B4A;
    --green-soft: #E7EFEA;
    --blue: #2D4A7A;
    --blue-soft: #E5ECF5;
    --font-serif: 'Instrument Serif', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
    --font-sans: 'Geist', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  ::selection { background: var(--brand); color: white; }

  body {
    background: var(--bg);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
  }

  .tabular { font-variant-numeric: tabular-nums; }

  /* Header */
  .header {
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header-inner {
    display: flex;
    align-items: center;
    padding: 14px 28px;
    gap: 32;
    max-width: 1440px;
    margin: 0 auto;
  }
  .header-brand {
    font-family: var(--font-serif);
    font-size: 26px;
    font-style: italic;
    color: var(--ink);
    letter-spacing: -0.02em;
  }
  .header-sub {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--muted-soft);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-left: 10px;
  }

  /* Main */
  .main {
    padding: 32px 36px 80px;
    max-width: 1440px;
    margin: 0 auto;
  }

  /* Title block */
  .title-block { margin-bottom: 28px; }
  .label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--muted-soft);
    text-transform: uppercase;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .page-title {
    font-family: var(--font-serif);
    font-size: 44px;
    color: var(--ink);
    line-height: 1.05;
    letter-spacing: -0.015em;
  }
  .page-title em {
    font-style: italic;
    color: var(--muted);
  }
  .page-sub {
    font-size: 13px;
    color: var(--muted);
    margin-top: 10px;
  }

  /* Stat strip */
  .stat-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 24px;
  }
  .stat-cell {
    padding: 20px 22px;
    border-right: 1px solid var(--border);
  }
  .stat-cell:last-child { border-right: none; }
  .stat-val {
    font-family: var(--font-serif);
    font-size: 28px;
    color: var(--ink);
    line-height: 1;
    margin-top: 12px;
  }
  .stat-sub {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    margin-top: 8px;
  }

  /* Section headers */
  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 16px;
    margin-top: 32px;
  }
  .section-title {
    font-family: var(--font-serif);
    font-size: 26px;
    color: var(--ink);
    line-height: 1.1;
  }
  .section-title em { font-style: italic; color: var(--muted); }
  .section-sub {
    font-size: 12px;
    color: var(--muted);
    margin-top: 6px;
  }

  /* Sort controls */
  .sort-bar {
    display: grid;
    grid-template-columns: 36px 1.7fr 100px 90px 100px 80px 80px;
    padding: 12px 24px;
    gap: 14;
    background: var(--bg);
    border-bottom: 1px solid var(--border-soft);
    align-items: center;
  }
  .sort-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--muted-soft);
    text-transform: uppercase;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
  }
  .sort-btn.active { color: var(--ink); }
  .sort-btn.right { justify-content: flex-end; }
  .sort-arrow { font-size: 9px; }

  /* Agent table */
  .agents-table {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }
  .agent-row {
    display: grid;
    grid-template-columns: 36px 1.7fr 100px 90px 100px 80px 80px;
    padding: 18px 24px;
    gap: 14;
    align-items: center;
    cursor: pointer;
    transition: background 80ms ease;
  }
  .row-hover:hover { background: var(--border-soft); }
  .agent-icon {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
  }
  .agent-name {
    font-size: 14px;
    color: var(--ink);
    font-weight: 500;
    margin-bottom: 2px;
  }
  .agent-path {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
  }
  .agent-cost {
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--ink);
    text-align: right;
    font-weight: 500;
  }
  .agent-outcomes {
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--ink);
    text-align: right;
  }
  .agent-cpo {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--muted);
    text-align: right;
  }
  .agent-sessions {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--muted);
    text-align: right;
  }
  .agent-last {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--muted-soft);
    text-align: right;
  }

  /* Agent detail (expandable) */
  .agent-detail {
    display: none;
    padding: 0 24px 24px 74px;
    border-bottom: 1px solid var(--border-soft);
    background: var(--muted-bg);
  }
  .agent-detail.open { display: block; }
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding-top: 8px;
  }
  .detail-section { }
  .detail-full { grid-column: 1 / -1; }

  /* Tools */
  .tool-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
  .tool-pill {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 3px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--ink70);
    letter-spacing: 0.02em;
  }

  /* MCP */
  .mcp-row { display: flex; align-items: baseline; gap: 8px; margin-top: 4px; }
  .mcp-name { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--brand); }
  .mcp-tools { font-family: var(--font-mono); font-size: 10px; color: var(--muted); }

  /* Outcomes line */
  .outcomes-line { font-size: 13px; line-height: 2; margin-top: 4px; }
  .stat-n { font-family: var(--font-serif); font-size: 18px; color: var(--ink); margin-right: 2px; }
  .dot-sep { color: var(--border-strong); margin: 0 6px; }
  .text-muted { color: var(--muted-soft); font-style: italic; font-size: 12px; }

  /* Model bar */
  .model-bar { display: flex; height: 24px; border-radius: 4px; overflow: hidden; gap: 2px; margin-top: 6px; }
  .model-seg { display: flex; align-items: center; justify-content: center; min-width: 40px; }
  .model-lbl { font-family: var(--font-mono); font-size: 9px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 5px; }

  /* Sessions */
  .session-item { padding: 6px 0; border-bottom: 1px solid var(--border-soft); }
  .session-item:last-child { border-bottom: none; }
  .session-head { display: flex; align-items: flex-start; gap: 8px; }
  .comp-clean { color: var(--green); font-size: 10px; }
  .comp-int { color: var(--rust); font-size: 10px; }
  .session-summary { font-size: 11px; color: var(--muted); line-height: 1.4; }

  /* Spend section */
  .spend-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 28px;
    margin-top: 24px;
  }
  .spend-row {
    display: grid;
    grid-template-columns: 140px 1fr 100px 100px;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-soft);
    gap: 16px;
  }
  .spend-row:last-child { border-bottom: none; }
  .spend-model { font-family: var(--font-mono); font-size: 12px; color: var(--ink); font-weight: 500; }
  .spend-bar-wrap { height: 6px; background: var(--muted-bg); border-radius: 3px; overflow: hidden; }
  .spend-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
  .spend-tokens { font-family: var(--font-mono); font-size: 11px; color: var(--muted); text-align: right; }
  .spend-cost { font-family: var(--font-mono); font-size: 13px; color: var(--rust); text-align: right; font-weight: 500; }

  /* Outcome summary cards */
  .outcome-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-top: 24px;
  }
  .outcome-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 18px 16px;
  }
  .outcome-card-val {
    font-family: var(--font-serif);
    font-size: 28px;
    color: var(--ink);
    line-height: 1;
    margin-top: 8px;
  }
  .outcome-card-sub {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    margin-top: 6px;
  }

  /* Footer */
  .footer {
    margin-top: 40px;
    padding: 20px 0;
    border-top: 1px solid var(--border-soft);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted-soft);
  }

  @media (max-width: 900px) {
    .stat-strip { grid-template-columns: repeat(3, 1fr); }
    .stat-cell:nth-child(3) { border-right: none; }
    .agent-row, .sort-bar { grid-template-columns: 36px 1fr 90px 70px; }
    .agent-cpo, .agent-sessions, .agent-last { display: none; }
    .sort-bar > :nth-child(5), .sort-bar > :nth-child(6), .sort-bar > :nth-child(7) { display: none; }
    .detail-grid { grid-template-columns: 1fr; }
    .page-title { font-size: 32px; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <span class="header-brand">Compass</span>
    <span class="header-sub">claude code fleet report</span>
  </div>
</div>

<div class="main">
  <div class="title-block">
    <div class="label">Retrospective · All Projects</div>
    <h1 class="page-title">Fleet Activity <em>· what your agents shipped</em></h1>
    <div class="page-sub">${totals.agents} agents · ${totals.sessions} sessions · ${totals.outcomes} outcomes · ${fmtUsd(totals.usd)} estimated API cost</div>
  </div>

  <div class="stat-strip">
    <div class="stat-cell">
      <div class="label">Fleet spend</div>
      <div class="stat-val" style="color:var(--ink)">${fmtUsd(totals.usd)}</div>
      <div class="stat-sub">estimated at API rates</div>
    </div>
    <div class="stat-cell">
      <div class="label">Outcomes shipped</div>
      <div class="stat-val">${totals.outcomes}</div>
      <div class="stat-sub">across ${totals.agents} agents</div>
    </div>
    <div class="stat-cell">
      <div class="label">Avg per outcome</div>
      <div class="stat-val">${fmtUsd(avgCpo)}</div>
      <div class="stat-sub">commits + pushes + files + tests</div>
    </div>
    <div class="stat-cell">
      <div class="label">Active agents</div>
      <div class="stat-val">${totals.agents}</div>
      <div class="stat-sub">${totals.sessions} total sessions</div>
    </div>
    <div class="stat-cell">
      <div class="label">Top agent</div>
      <div class="stat-val" style="color:var(--brand);font-size:22px">${esc(agents[0]?.name || '—')}</div>
      <div class="stat-sub">${agents[0]?.sessionCount || 0} sessions · ${fmtUsd(agents[0]?.cost?.totalUsd || 0)}</div>
    </div>
  </div>

  <div class="outcome-grid">
    <div class="outcome-card">
      <div class="label">Commits</div>
      <div class="outcome-card-val">${totalCommits}</div>
      <div class="outcome-card-sub">git commit calls detected</div>
    </div>
    <div class="outcome-card">
      <div class="label">Pushes / PRs</div>
      <div class="outcome-card-val">${totalPushes}</div>
      <div class="outcome-card-sub">git push + gh pr create</div>
    </div>
    <div class="outcome-card">
      <div class="label">Files changed</div>
      <div class="outcome-card-val">${totalFiles}</div>
      <div class="outcome-card-sub">unique Write / Edit targets</div>
    </div>
    <div class="outcome-card">
      <div class="label">Tests passed</div>
      <div class="outcome-card-val">${totalTests}</div>
      <div class="outcome-card-sub">test runner stdout matches</div>
    </div>
    <div class="outcome-card">
      <div class="label">MCP actions</div>
      <div class="outcome-card-val">${totalMcpActions}</div>
      <div class="outcome-card-sub">across all MCP servers</div>
    </div>
  </div>

  <div class="section-head">
    <div>
      <h2 class="section-title">Where the money went</h2>
      <div class="section-sub">Click a row to expand details. Click column headers to sort.</div>
    </div>
  </div>

  <div class="agents-table" id="agents-table">
    <div class="sort-bar">
      <span></span>
      <button class="sort-btn active" data-sort="name" data-dir="asc">Agent <span class="sort-arrow">↑</span></button>
      <button class="sort-btn right" data-sort="spend" data-dir="desc">Spend</button>
      <button class="sort-btn right" data-sort="outcomes" data-dir="desc">Outcomes</button>
      <button class="sort-btn right" data-sort="spend" data-dir="desc">$ / outcome</button>
      <button class="sort-btn right" data-sort="sessions" data-dir="desc">Sessions</button>
      <button class="sort-btn right" data-sort="name" data-dir="asc">Last used</button>
    </div>
    <div id="agent-rows">
      ${agentRows}
    </div>
  </div>

  ${pricing ? `
  <div class="spend-section">
    <div class="section-title" style="margin-bottom:6px">Spend by model</div>
    <div class="section-sub" style="margin-bottom:20px">Token-weighted cost breakdown at published API rates</div>
    ${renderSpendByModel(pricing)}
  </div>` : ''}

  <div class="footer">
    compass-cli · generated ${esc(reportData.generatedAt)} · estimated costs at anthropic published api rates · local scan of ~/.claude/
  </div>
</div>

<script>
(function() {
  // Expand/collapse agent details
  document.querySelectorAll('.agent-row').forEach(function(row, i) {
    row.addEventListener('click', function() {
      var detail = document.getElementById('detail-' + i);
      if (!detail) return;
      var isOpen = detail.classList.contains('open');
      document.querySelectorAll('.agent-detail.open').forEach(function(d) { d.classList.remove('open'); });
      if (!isOpen) detail.classList.add('open');
    });
  });

  // Sort columns
  var currentSort = 'spend';
  var currentDir = 'desc';
  document.querySelectorAll('.sort-btn[data-sort]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var field = btn.dataset.sort;
      if (field === currentSort) {
        currentDir = currentDir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = field;
        currentDir = field === 'name' ? 'asc' : 'desc';
      }

      document.querySelectorAll('.sort-btn').forEach(function(b) {
        b.classList.remove('active');
        b.querySelector('.sort-arrow')?.remove();
      });
      btn.classList.add('active');
      var arrow = document.createElement('span');
      arrow.className = 'sort-arrow';
      arrow.textContent = currentDir === 'asc' ? ' ↑' : ' ↓';
      btn.appendChild(arrow);

      var container = document.getElementById('agent-rows');
      var items = Array.from(container.children).filter(function(el) {
        return el.classList.contains('agent-row');
      });

      var pairs = [];
      for (var i = 0; i < items.length; i++) {
        var detail = items[i].nextElementSibling;
        if (detail && detail.classList.contains('agent-detail')) {
          pairs.push([items[i], detail]);
        } else {
          pairs.push([items[i], null]);
        }
      }

      pairs.sort(function(a, b) {
        var av, bv;
        if (field === 'name') {
          av = a[0].dataset.name.toLowerCase();
          bv = b[0].dataset.name.toLowerCase();
          return currentDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        av = parseFloat(a[0].dataset[field]) || 0;
        bv = parseFloat(b[0].dataset[field]) || 0;
        return currentDir === 'asc' ? av - bv : bv - av;
      });

      container.innerHTML = '';
      pairs.forEach(function(pair) {
        container.appendChild(pair[0]);
        if (pair[1]) container.appendChild(pair[1]);
      });
    });
  });

  // Auto-sort by spend desc on load
  var spendBtn = document.querySelector('.sort-btn[data-sort="spend"]');
  if (spendBtn) spendBtn.click();
})();
</script>

</body>
</html>`;
}
