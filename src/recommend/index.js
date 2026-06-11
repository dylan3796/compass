import { contextCostUsd } from '../pricing/index.js';

// Port of the four Compass recommender detectors that map to signals the
// local scan actually has. The other two (prompt_regression,
// restructure_input) need an output-quality score that transcripts don't
// carry, so they stay out until an outcome-quality signal exists.
const MIN_SESSIONS = 5;
const TRIM_MEDIAN_MULTIPLE = 2;
const TRIM_RATIO_FLOOR = 12;
const TRIM_HIGH_SAVINGS_USD = 50;
const GUARDRAIL_COMPLETION = 0.6;
const CLONE_BOTTOM_FRAC = 0.4;
const CLONE_MIN_COST_USD = 1;
const CLONE_SAVINGS_FRAC = 0.2;
const BURST_SESSIONS_PER_HOUR = 8;

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function fmtK(n) {
  return n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(Math.round(n));
}

function agentStats(agent) {
  const perModel = agent.perModel || {};
  let contextTokens = 0;
  let outputTokens = 0;
  for (const data of Object.values(perModel)) {
    contextTokens += data.input + data.cacheWrite + data.cacheRead;
    outputTokens += data.output;
  }

  const sessions = agent.outcomes?.sessions || [];
  const clean = sessions.filter(s => s.completion === 'clean').length;

  const o = agent.outcomes || {};
  const mcpTotal = Object.values(o.mcpActions || {}).reduce(
    (s, tools) => s + Object.values(tools).reduce((a, b) => a + b, 0), 0
  );
  const totalOutcomes = (o.commits || 0) + (o.pushes || 0) + (o.prsOpened || 0)
    + (o.prsMerged || 0) + (o.filesChanged || 0) + (o.testsPassed || 0) + mcpTotal;

  return {
    agent,
    contextPerSession: agent.sessionCount > 0 ? contextTokens / agent.sessionCount : 0,
    outputPerSession: agent.sessionCount > 0 ? outputTokens / agent.sessionCount : 0,
    completionRate: sessions.length > 0 ? clean / sessions.length : null,
    attributedSessions: sessions.length,
    totalOutcomes,
    costUsd: agent.cost?.totalUsd || 0,
  };
}

export function recommend(agents, sessions = []) {
  const recs = [];
  const add = (agent, type, severity, description, detail, savings) => {
    recs.push({
      agentId: agent.id,
      agentName: agent.name,
      type,
      severity,
      description,
      detail,
      estimatedSavingsUsd: savings ? Math.round(savings * 100) / 100 : null,
    });
  };

  const stats = agents.map(agentStats);
  const eligible = stats.filter(s => s.agent.sessionCount >= MIN_SESSIONS);

  // 1. trim_context — context volume per session far above fleet median,
  // dominated by input/cache rather than output
  const flagged = new Set();
  const fleetMedian = median(eligible.map(s => s.contextPerSession).filter(v => v > 0));
  if (fleetMedian > 0) {
    for (const s of eligible) {
      const ratio = s.contextPerSession / Math.max(1, s.outputPerSession);
      if (s.contextPerSession > TRIM_MEDIAN_MULTIPLE * fleetMedian && ratio >= TRIM_RATIO_FLOOR) {
        const savings = contextCostUsd(s.agent.perModel) * (1 - fleetMedian / s.contextPerSession);
        add(s.agent, 'trim_context', savings > TRIM_HIGH_SAVINGS_USD ? 'high' : 'medium',
          `${s.agent.name} reads ~${fmtK(s.contextPerSession)} context tokens per session to produce ~${fmtK(s.outputPerSession)} — trim CLAUDE.md, hooks, or attached files to structured input.`,
          `Context per session (input + cache) is ${(s.contextPerSession / fleetMedian).toFixed(1)}x the fleet median of ${fmtK(fleetMedian)} with a context/output ratio of ${ratio.toFixed(0)}:1. Savings assume trimming to the fleet median.`,
          savings);
        flagged.add(s.agent.id);
      }
    }
  }

  // 2. add_guardrail — sessions rarely reach a clean stop
  for (const s of eligible) {
    if (s.completionRate !== null && s.attributedSessions >= MIN_SESSIONS
        && s.completionRate < GUARDRAIL_COMPLETION) {
      const wasted = s.costUsd * (1 - s.completionRate);
      add(s.agent, 'add_guardrail', 'high',
        `${s.agent.name} ends only ${Math.round(s.completionRate * 100)}% of sessions cleanly — add a completion check or tighter task scoping.`,
        `${s.attributedSessions - Math.round(s.completionRate * s.attributedSessions)} of ${s.attributedSessions} attributed sessions stopped without a clean end turn (threshold ${Math.round(GUARDRAIL_COMPLETION * 100)}%). ~${Math.round(wasted)} USD of this agent's spend sits in sessions that never finished.`,
        wasted);
      flagged.add(s.agent.id);
    }
  }

  // 3. clone_best_performer — bottom of the fleet on outcomes per dollar,
  // not already explained by a more specific recommendation above
  const ranked = eligible
    .filter(s => s.costUsd >= CLONE_MIN_COST_USD && s.totalOutcomes > 0)
    .map(s => ({ ...s, outcomesPerUsd: s.totalOutcomes / s.costUsd }))
    .sort((a, b) => a.outcomesPerUsd - b.outcomesPerUsd);
  if (ranked.length >= 3) {
    const best = ranked[ranked.length - 1];
    const bottom = ranked.slice(0, Math.max(1, Math.floor(ranked.length * CLONE_BOTTOM_FRAC)));
    for (const s of bottom) {
      if (flagged.has(s.agent.id) || s.agent.id === best.agent.id) continue;
      add(s.agent, 'clone_best_performer', 'medium',
        `${best.agent.name} ships ${(best.outcomesPerUsd / s.outcomesPerUsd).toFixed(1)}x more outcomes per dollar than ${s.agent.name} — compare their CLAUDE.md and skill setup.`,
        `${s.agent.name} produced ${s.totalOutcomes} outcomes on $${s.costUsd.toFixed(2)} (${s.outcomesPerUsd.toFixed(1)}/$); the fleet's best, ${best.agent.name}, produced ${best.totalOutcomes} on $${best.costUsd.toFixed(2)} (${best.outcomesPerUsd.toFixed(1)}/$). Savings assume closing ~20% of the gap.`,
        s.costUsd * CLONE_SAVINGS_FRAC);
    }
  }

  // 4. loop_burst — many sessions started inside one hour, likely a
  // retry/automation loop rather than a person
  const createdByAgent = new Map();
  for (const agent of agents) {
    createdByAgent.set(agent.id, new Set(agent.sessionIds || []));
  }
  for (const agent of agents) {
    const ids = createdByAgent.get(agent.id);
    const byHour = {};
    for (const session of sessions) {
      if (!ids.has(session.id)) continue;
      const created = session.indexMeta?.created;
      if (!created) continue;
      const hour = created.slice(0, 13);
      byHour[hour] = (byHour[hour] || 0) + 1;
    }
    const peak = Math.max(0, ...Object.values(byHour));
    if (peak >= BURST_SESSIONS_PER_HOUR) {
      add(agent, 'loop_burst', 'medium',
        `${agent.name} started ${peak} sessions in a single hour — likely a retry or automation loop. Check the trigger before it burns spend.`,
        `Peak of ${peak} sessions/hour observed (threshold ${BURST_SESSIONS_PER_HOUR}/hour). If this is an intentional batch job, ignore; otherwise add a rate limit or fix the failing trigger.`,
        null);
    }
  }

  const sevRank = { high: 0, medium: 1 };
  recs.sort((a, b) =>
    (sevRank[a.severity] - sevRank[b.severity])
    || ((b.estimatedSavingsUsd || 0) - (a.estimatedSavingsUsd || 0)));
  return recs;
}
