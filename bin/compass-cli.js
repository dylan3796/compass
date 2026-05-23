#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { scan } from '../src/scan/index.js';
import { classify } from '../src/classify/index.js';
import { attribute } from '../src/attribute/index.js';
import { price } from '../src/pricing/index.js';
import { render } from '../src/render/index.js';

const args = process.argv.slice(2);
const command = args[0];

if (command !== 'scan') {
  console.error('Usage: compass-cli scan [--out report.html]');
  process.exit(1);
}

const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 ? resolve(args[outIdx + 1]) : resolve('compass-report.html');

async function main() {
  const start = Date.now();

  process.stderr.write('Scanning ~/.claude/...\n');
  const scanResult = await scan();

  process.stderr.write(`Found ${scanResult.projects.length} projects, ${scanResult.sessions.length} sessions\n`);

  process.stderr.write('Classifying agents...\n');
  const classifierResult = await classify(scanResult);

  process.stderr.write('Attributing outcomes...\n');
  const attributorResult = await attribute(scanResult);

  process.stderr.write('Calculating costs...\n');
  const pricerResult = price(classifierResult);

  const agents = classifierResult.agents.map(agent => {
    const outcomes = attributorResult.byAgent[agent.id] || {
      commits: 0, pushes: 0, filesChanged: 0, testsPassed: 0, mcpActions: {}, sessions: [],
    };
    const cost = pricerResult.byAgent[agent.id] || { totalUsd: 0, sessions: {} };
    return { ...agent, outcomes, cost };
  });

  const totalOutcomes = agents.reduce((sum, a) => {
    const o = a.outcomes;
    const mcpTotal = Object.values(o.mcpActions || {}).reduce(
      (s, tools) => s + Object.values(tools).reduce((a, b) => a + b, 0), 0
    );
    return sum + o.commits + o.pushes + o.filesChanged + o.testsPassed + mcpTotal;
  }, 0);

  const reportData = {
    generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    totals: {
      agents: agents.length,
      sessions: classifierResult.agents.reduce((s, a) => s + a.sessionCount, 0),
      outcomes: totalOutcomes,
      usd: pricerResult.totalUsd,
    },
    agents,
    pricing: pricerResult,
  };

  process.stderr.write('Rendering report...\n');
  const html = render(reportData);

  writeFileSync(outPath, html, 'utf-8');
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  process.stderr.write(`Done in ${elapsed}s → ${outPath}\n`);

  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      execSync(`open "${outPath}"`);
    } else if (platform === 'linux') {
      execSync(`xdg-open "${outPath}"`);
    } else if (platform === 'win32') {
      execSync(`start "" "${outPath}"`);
    }
  } catch {
    // browser open is best-effort
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
