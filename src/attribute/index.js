import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const GIT_COMMIT_RE = /git\s+commit/;
const GIT_PUSH_RE = /git\s+push/;
const PR_OPEN_RE = /gh\s+pr\s+create/;
const PR_MERGE_RE = /gh\s+pr\s+merge/;
const TEST_PASS_RE = /(\d+)\s+(tests?\s+)?pass(ed|ing)?|All\s+\d+\s+tests?\s+passed|✓|PASSED|ok\s+\d+/i;

// GitHub MCP tools that represent the same PR outcomes as the gh CLI
const MCP_PR_OPEN_TOOLS = new Set(['create_pull_request']);
const MCP_PR_MERGE_TOOLS = new Set(['merge_pull_request']);

function extractOutcomesFromBash(command, resultText) {
  const outcomes = [];
  if (GIT_COMMIT_RE.test(command)) outcomes.push('committed');
  if (GIT_PUSH_RE.test(command)) outcomes.push('pushed');
  if (PR_OPEN_RE.test(command)) outcomes.push('opened PR');
  if (PR_MERGE_RE.test(command)) outcomes.push('merged PR');
  if (resultText && TEST_PASS_RE.test(resultText)) outcomes.push('tests passed');
  return outcomes;
}

function parseMcpToolName(name) {
  if (!name.startsWith('mcp__')) return null;
  const rest = name.slice(5);
  const lastDunder = rest.lastIndexOf('__');
  if (lastDunder === -1) return null;
  return { server: rest.slice(0, lastDunder), tool: rest.slice(lastDunder + 2) };
}

async function attributeTranscript(transcriptPath) {
  if (!existsSync(transcriptPath)) {
    return { commits: 0, pushes: 0, prsOpened: 0, prsMerged: 0, filesChanged: new Set(), testsPassed: 0, mcpActions: {}, outcomes: [], selfSummary: null, completion: 'interrupted' };
  }

  const rl = createInterface({ input: createReadStream(transcriptPath), crlfDelay: Infinity });

  let commits = 0;
  let pushes = 0;
  let prsOpened = 0;
  let prsMerged = 0;
  const filesChanged = new Set();
  let testsPassed = 0;
  const mcpActions = {};
  const outcomes = [];
  let lastAssistantText = null;
  let lastStopReason = null;

  const pendingToolCalls = new Map();
  const seenMsgIds = new Set();

  for await (const line of rl) {
    if (!line.trim()) continue;
    let d;
    try { d = JSON.parse(line); } catch { continue; }

    if (d.type === 'assistant') {
      const msg = d.message;
      if (!msg) continue;

      const msgId = msg.id;
      if (msgId && seenMsgIds.has(msgId)) continue;
      if (msgId) seenMsgIds.add(msgId);

      lastStopReason = msg.stop_reason || lastStopReason;

      for (const c of msg.content || []) {
        if (c.type === 'text' && c.text) {
          lastAssistantText = c.text;
        }

        if (c.type !== 'tool_use') continue;

        if (c.name === 'Write' || c.name === 'Edit' || c.name === 'MultiEdit') {
          const filePath = c.input?.file_path;
          if (filePath) filesChanged.add(filePath);
          if (c.name === 'MultiEdit' && Array.isArray(c.input?.edits)) {
            for (const edit of c.input.edits) {
              if (edit.file_path) filesChanged.add(edit.file_path);
            }
          }
        }

        if (c.name === 'Bash') {
          const cmd = c.input?.command || '';
          pendingToolCalls.set(c.id, { name: 'Bash', command: cmd });
        }

        const mcpParsed = parseMcpToolName(c.name);
        if (mcpParsed) {
          if (!mcpActions[mcpParsed.server]) mcpActions[mcpParsed.server] = {};
          mcpActions[mcpParsed.server][mcpParsed.tool] = (mcpActions[mcpParsed.server][mcpParsed.tool] || 0) + 1;

          if (MCP_PR_OPEN_TOOLS.has(mcpParsed.tool)) {
            prsOpened++;
            if (!outcomes.includes('opened PR')) outcomes.push('opened PR');
          }
          if (MCP_PR_MERGE_TOOLS.has(mcpParsed.tool)) {
            prsMerged++;
            if (!outcomes.includes('merged PR')) outcomes.push('merged PR');
          }
        }
      }
    }

    if (d.type === 'user') {
      for (const c of d.message?.content || []) {
        if (c.type !== 'tool_result') continue;

        const pending = pendingToolCalls.get(c.tool_use_id);
        if (!pending) continue;
        pendingToolCalls.delete(c.tool_use_id);

        if (pending.name === 'Bash') {
          const resultText = typeof c.content === 'string' ? c.content : '';
          const bashOutcomes = extractOutcomesFromBash(pending.command, resultText);
          for (const o of bashOutcomes) {
            if (o === 'committed') commits++;
            if (o === 'pushed') pushes++;
            if (o === 'opened PR') prsOpened++;
            if (o === 'merged PR') prsMerged++;
            if (o === 'tests passed') testsPassed++;
            if (!outcomes.includes(o)) outcomes.push(o);
          }
        }
      }
    }
  }

  if (filesChanged.size > 0) {
    outcomes.push(`wrote ${filesChanged.size} files`);
  }
  if (Object.keys(mcpActions).length > 0) {
    const total = Object.values(mcpActions).reduce((s, tools) => s + Object.values(tools).reduce((a, b) => a + b, 0), 0);
    outcomes.push(`${total} MCP actions`);
  }

  return {
    commits,
    pushes,
    prsOpened,
    prsMerged,
    filesChanged,
    testsPassed,
    mcpActions,
    outcomes,
    selfSummary: lastAssistantText ? lastAssistantText.slice(0, 500) : null,
    completion: lastStopReason === 'end_turn' ? 'clean' : 'interrupted',
  };
}

export async function attribute(scanResult) {
  const { projects, sessions } = scanResult;
  const byAgent = {};

  const sessionsByProject = {};
  for (const session of sessions) {
    if (!sessionsByProject[session.projectId]) sessionsByProject[session.projectId] = [];
    sessionsByProject[session.projectId].push(session);
  }

  for (const proj of projects) {
    const projSessions = sessionsByProject[proj.id] || [];
    let totalCommits = 0;
    let totalPushes = 0;
    let totalPrsOpened = 0;
    let totalPrsMerged = 0;
    const allFilesChanged = new Set();
    let totalTestsPassed = 0;
    const mergedMcp = {};
    const sessionResults = [];

    for (const session of projSessions) {
      const result = await attributeTranscript(session.transcriptPath);

      totalCommits += result.commits;
      totalPushes += result.pushes;
      totalPrsOpened += result.prsOpened;
      totalPrsMerged += result.prsMerged;
      for (const f of result.filesChanged) allFilesChanged.add(f);
      totalTestsPassed += result.testsPassed;

      for (const [server, tools] of Object.entries(result.mcpActions)) {
        if (!mergedMcp[server]) mergedMcp[server] = {};
        for (const [tool, count] of Object.entries(tools)) {
          mergedMcp[server][tool] = (mergedMcp[server][tool] || 0) + count;
        }
      }

      sessionResults.push({
        id: session.id,
        outcomes: result.outcomes,
        selfSummary: result.selfSummary || session.indexMeta?.summary || null,
        completion: result.completion,
      });
    }

    for (const sub of proj.subagentPaths || []) {
      const result = await attributeTranscript(sub.path);
      totalCommits += result.commits;
      totalPushes += result.pushes;
      totalPrsOpened += result.prsOpened;
      totalPrsMerged += result.prsMerged;
      for (const f of result.filesChanged) allFilesChanged.add(f);
      totalTestsPassed += result.testsPassed;
      for (const [server, tools] of Object.entries(result.mcpActions)) {
        if (!mergedMcp[server]) mergedMcp[server] = {};
        for (const [tool, count] of Object.entries(tools)) {
          mergedMcp[server][tool] = (mergedMcp[server][tool] || 0) + count;
        }
      }
    }

    byAgent[proj.id] = {
      commits: totalCommits,
      pushes: totalPushes,
      prsOpened: totalPrsOpened,
      prsMerged: totalPrsMerged,
      filesChanged: allFilesChanged.size,
      testsPassed: totalTestsPassed,
      mcpActions: mergedMcp,
      sessions: sessionResults,
    };
  }

  return { byAgent };
}
