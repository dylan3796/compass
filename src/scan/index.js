import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function listMdFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

function isWorktreeDir(dirName) {
  return dirName.includes('--claude-worktrees-');
}

function worktreeParentDirName(dirName) {
  const idx = dirName.indexOf('--claude-worktrees-');
  if (idx !== -1) return dirName.substring(0, idx);
  return dirName;
}

function cwdFromTranscript(projPath, transcriptFiles) {
  for (const f of transcriptFiles) {
    const filePath = join(projPath, f);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        if (!lines[i].trim()) continue;
        const d = JSON.parse(lines[i]);
        if (d.cwd) return d.cwd;
      }
    } catch { /* continue */ }
  }
  return null;
}

async function readFirstAndLastAssistant(transcriptPath) {
  const rl = createInterface({ input: createReadStream(transcriptPath), crlfDelay: Infinity });
  let firstModel = null;
  let lastAssistantText = null;
  let lastStopReason = null;
  let totalTokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let models = {};
  let startedAt = null;
  let endedAt = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    let d;
    try { d = JSON.parse(line); } catch { continue; }

    if (!startedAt && d.timestamp) startedAt = d.timestamp;
    if (d.timestamp) endedAt = d.timestamp;

    if (d.type === 'assistant') {
      const msg = d.message;
      if (!msg) continue;

      const model = msg.model || 'unknown';
      if (!firstModel) firstModel = model;
      models[model] = (models[model] || 0) + 1;

      if (msg.usage) {
        totalTokens.input += msg.usage.input_tokens || 0;
        totalTokens.output += msg.usage.output_tokens || 0;
        totalTokens.cacheRead += msg.usage.cache_read_input_tokens || 0;
        totalTokens.cacheWrite += msg.usage.cache_creation_input_tokens || 0;
      }

      lastStopReason = msg.stop_reason || null;

      const textParts = (msg.content || [])
        .filter(c => c.type === 'text')
        .map(c => c.text);
      if (textParts.length > 0) {
        lastAssistantText = textParts.join('\n');
      }
    }
  }

  return {
    model: firstModel || 'unknown',
    models,
    tokens: totalTokens,
    stopReason: lastStopReason || 'unknown',
    startedAt,
    endedAt,
    selfSummary: lastAssistantText ? lastAssistantText.slice(0, 500) : null,
  };
}

export async function scan(claudeHome) {
  claudeHome = claudeHome || join(homedir(), '.claude');

  const settings = readJsonSafe(join(claudeHome, 'settings.json'));
  const globalCommands = listMdFiles(join(claudeHome, 'commands'));
  const globalAgents = listMdFiles(join(claudeHome, 'agents'));

  const projectsDir = join(claudeHome, 'projects');
  const projectDirs = existsSync(projectsDir)
    ? readdirSync(projectsDir).filter(d => statSync(join(projectsDir, d)).isDirectory())
    : [];

  const projects = [];
  const sessions = [];

  for (const dirName of projectDirs) {
    const projPath = join(projectsDir, dirName);
    const isWorktree = isWorktreeDir(dirName);
    const parentDirName = isWorktree ? worktreeParentDirName(dirName) : dirName;

    const index = readJsonSafe(join(projPath, 'sessions-index.json'));
    const indexEntries = index?.entries || [];

    const transcriptFiles = readdirSync(projPath).filter(f => f.endsWith('.jsonl'));

    const realPath = indexEntries[0]?.projectPath
      || cwdFromTranscript(projPath, transcriptFiles)
      || null;
    const sessionDirs = readdirSync(projPath).filter(f => {
      const fp = join(projPath, f);
      return statSync(fp).isDirectory() && f !== 'subagents';
    });

    const sessionIds = [
      ...transcriptFiles.map(f => f.replace(/\.jsonl$/, '')),
      ...sessionDirs,
    ];

    const subagentPaths = [];
    for (const sd of sessionDirs) {
      const subDir = join(projPath, sd, 'subagents');
      if (existsSync(subDir)) {
        for (const sf of readdirSync(subDir).filter(f => f.endsWith('.jsonl'))) {
          subagentPaths.push({
            sessionId: sd,
            subagentId: sf.replace(/\.jsonl$/, ''),
            path: join(subDir, sf),
          });
        }
      }
    }

    projects.push({
      id: dirName,
      workingDir: realPath || dirName,
      parentDirName,
      isWorktree,
      slashCommands: [...globalCommands],
      customAgents: [...globalAgents],
      sessionIds,
      subagentPaths,
      indexEntries,
    });

    for (const entry of indexEntries) {
      const transcriptPath = entry.fullPath || join(projPath, entry.sessionId + '.jsonl');
      sessions.push({
        id: entry.sessionId,
        projectId: dirName,
        transcriptPath,
        indexMeta: {
          summary: entry.summary || null,
          firstPrompt: entry.firstPrompt || null,
          messageCount: entry.messageCount || 0,
          created: entry.created || null,
          modified: entry.modified || null,
          gitBranch: entry.gitBranch || null,
          projectPath: entry.projectPath || null,
        },
      });
    }

    for (const sid of sessionIds) {
      const alreadyIndexed = indexEntries.some(e => e.sessionId === sid);
      if (!alreadyIndexed) {
        const transcriptPath = join(projPath, sid + '.jsonl');
        if (existsSync(transcriptPath)) {
          sessions.push({
            id: sid,
            projectId: dirName,
            transcriptPath,
            indexMeta: null,
          });
        }
      }
    }
  }

  return { claudeHome, settings, projects, sessions };
}
