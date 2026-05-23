import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { basename } from 'node:path';

const BUILT_IN_TOOLS = new Set([
  'Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep',
  'WebSearch', 'WebFetch', 'TodoWrite', 'NotebookEdit', 'SlashCommand',
  'Skill', 'Task', 'Agent',
]);

function parseMcpToolName(name) {
  if (!name.startsWith('mcp__')) return null;
  const rest = name.slice(5);
  const lastDunder = rest.lastIndexOf('__');
  if (lastDunder === -1) return null;
  return { server: rest.slice(0, lastDunder), tool: rest.slice(lastDunder + 2) };
}

function addModelTokens(perModel, model, usage) {
  if (!perModel[model]) {
    perModel[model] = { turns: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  }
  perModel[model].turns += 1;
  perModel[model].input += usage.input_tokens || 0;
  perModel[model].output += usage.output_tokens || 0;
  perModel[model].cacheWrite += usage.cache_creation_input_tokens || 0;
  perModel[model].cacheRead += usage.cache_read_input_tokens || 0;
}

async function extractToolsFromTranscript(transcriptPath) {
  if (!existsSync(transcriptPath)) {
    return { builtIn: new Set(), mcp: new Map(), perModel: {}, lastTimestamp: null };
  }

  const rl = createInterface({ input: createReadStream(transcriptPath), crlfDelay: Infinity });
  const builtIn = new Set();
  const mcp = new Map();
  const perModel = {};
  let lastTimestamp = null;
  const seenMsgIds = new Set();

  for await (const line of rl) {
    if (!line.trim()) continue;
    let d;
    try { d = JSON.parse(line); } catch { continue; }

    if (d.timestamp) lastTimestamp = d.timestamp;

    if (d.type !== 'assistant') continue;
    const msg = d.message;
    if (!msg) continue;

    const msgId = msg.id;
    if (msgId && seenMsgIds.has(msgId)) continue;
    if (msgId) seenMsgIds.add(msgId);

    const model = msg.model || 'unknown';
    if (model === '<synthetic>' || model === 'synthetic') continue;
    if (msg.usage) {
      addModelTokens(perModel, model, msg.usage);
    }

    for (const c of msg.content || []) {
      if (c.type !== 'tool_use') continue;

      if (BUILT_IN_TOOLS.has(c.name)) {
        builtIn.add(c.name);
        continue;
      }

      const mcpParsed = parseMcpToolName(c.name);
      if (mcpParsed) {
        if (!mcp.has(mcpParsed.server)) mcp.set(mcpParsed.server, new Set());
        mcp.get(mcpParsed.server).add(mcpParsed.tool);
        continue;
      }

      builtIn.add(c.name);
    }
  }

  return { builtIn, mcp, perModel, lastTimestamp };
}

function mergePerModel(target, source) {
  for (const [model, data] of Object.entries(source)) {
    if (!target[model]) {
      target[model] = { turns: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
    }
    target[model].turns += data.turns;
    target[model].input += data.input;
    target[model].output += data.output;
    target[model].cacheWrite += data.cacheWrite;
    target[model].cacheRead += data.cacheRead;
  }
}

export async function classify(scanResult) {
  const { projects, sessions } = scanResult;

  const projectGroups = new Map();
  for (const proj of projects) {
    const groupKey = proj.parentDirName;
    if (!projectGroups.has(groupKey)) {
      projectGroups.set(groupKey, { projects: [], sessions: [] });
    }
    projectGroups.get(groupKey).projects.push(proj);
  }

  for (const session of sessions) {
    const proj = projects.find(p => p.id === session.projectId);
    if (!proj) continue;
    const groupKey = proj.parentDirName;
    if (projectGroups.has(groupKey)) {
      projectGroups.get(groupKey).sessions.push(session);
    }
  }

  const agents = [];

  for (const [groupKey, group] of projectGroups) {
    const allBuiltIn = new Set();
    const allMcp = new Map();
    const perModel = {};
    let lastUsed = null;

    for (const session of group.sessions) {
      const result = await extractToolsFromTranscript(session.transcriptPath);

      for (const t of result.builtIn) allBuiltIn.add(t);
      for (const [server, tools] of result.mcp) {
        if (!allMcp.has(server)) allMcp.set(server, new Set());
        for (const t of tools) allMcp.get(server).add(t);
      }
      mergePerModel(perModel, result.perModel);

      if (result.lastTimestamp && (!lastUsed || result.lastTimestamp > lastUsed)) {
        lastUsed = result.lastTimestamp;
      }
    }

    for (const proj of group.projects) {
      for (const sub of proj.subagentPaths || []) {
        const result = await extractToolsFromTranscript(sub.path);
        for (const t of result.builtIn) allBuiltIn.add(t);
        for (const [server, tools] of result.mcp) {
          if (!allMcp.has(server)) allMcp.set(server, new Set());
          for (const t of tools) allMcp.get(server).add(t);
        }
        mergePerModel(perModel, result.perModel);
      }
    }

    const totalInput = Object.values(perModel).reduce((s, m) => s + m.input, 0);
    const totalOutput = Object.values(perModel).reduce((s, m) => s + m.output, 0);

    const modelBreakdown = {};
    for (const [model, data] of Object.entries(perModel)) {
      modelBreakdown[model] = data.turns;
    }

    const firstProj = group.projects[0];
    const realPath = firstProj.workingDir;
    const displayName = typeof realPath === 'string' && realPath.startsWith('/') ? basename(realPath) : groupKey;

    agents.push({
      id: firstProj.id,
      name: displayName,
      workingDir: realPath,
      builtInToolsObserved: [...allBuiltIn].sort(),
      mcpServers: [...allMcp.entries()].map(([name, tools]) => ({
        name,
        tools: [...tools].sort(),
      })),
      slashCommands: [...new Set(group.projects.flatMap(p => p.slashCommands))].sort(),
      customAgents: [...new Set(group.projects.flatMap(p => p.customAgents))].sort(),
      sessionCount: group.sessions.length,
      modelBreakdown,
      perModel,
      tokens: { input: totalInput, output: totalOutput },
      lastUsed,
      sessionIds: group.sessions.map(s => s.id),
    });
  }

  agents.sort((a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || ''));

  return { agents: agents.filter(a => a.sessionCount > 0) };
}
