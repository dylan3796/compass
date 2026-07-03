/**
 * The workbench join engine — runs entirely in the browser on the customer's
 * own exports. No row ever leaves the tab. Deterministic throughout: every
 * number here is replayable from the two files and the chosen columns, which
 * is the same bar the product holds itself to (grade D — rules).
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** Minimal RFC-4180 CSV parser: quotes, escaped quotes, CRLF, embedded newlines. */
export function parseCsv(text: string, maxRows = 200_000): ParsedCsv {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      if (rows.length > maxRows) break;
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows };
}

/** Guess a column index by name against a ranked list of candidates. */
export function guessColumn(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const cand of candidates) {
    const exact = lower.indexOf(cand);
    if (exact !== -1) return exact;
  }
  for (const cand of candidates) {
    const partial = lower.findIndex((h) => h.includes(cand));
    if (partial !== -1) return partial;
  }
  return -1;
}

export const COLUMN_GUESSES = {
  joinKey: ["ticketid", "entityid", "conversationid", "requestid", "opportunityid", "issueid", "id", "key"],
  agent: ["agent", "actor", "workflow", "botname", "assistant", "app"],
  model: ["model", "modelname", "llm", "engine"],
  cost: ["cost", "costusd", "spend", "price", "amount", "totalcost"],
  event: ["event", "outcome", "action", "type", "name"],
  status: ["status", "state", "result", "quality", "resolution", "disposition"],
} as const;

export interface WorkbenchConfig {
  activityKeyCol: number;
  outcomeKeyCol: number;
  agentCol: number; // -1 = none
  modelCol: number; // -1 = none
  costCol: number; // -1 = none
  statusCol: number; // -1 = none
  /** Which status values count as passing the quality bar. */
  passValues: Set<string>;
}

export interface AgentRow {
  agent: string;
  runs: number;
  outcomesJoined: number;
  verifiedJoined: number;
  cost: number | null;
  costPerVerified: number | null;
}

export interface ModelRow {
  model: string;
  runs: number;
  verifiedJoined: number;
  costPerVerified: number | null;
}

export interface Recommendation {
  kind: "join" | "reroute" | "unverified" | "baseline" | "quality";
  line: string;
  detail: string;
}

export interface WorkbenchResult {
  activityRows: number;
  outcomeRows: number;
  runsWithKey: number;
  /** Outcomes: claimed ≥ verified ≥ joined (grade D — rules). */
  claimed: number;
  verified: number;
  joined: number;
  joinCoveragePct: number; // % of verified outcomes with ≥1 matching run
  keyCoveragePct: number; // % of runs carrying a join key
  totalCost: number | null;
  costPerVerifiedJoined: number | null;
  agents: AgentRow[];
  models: ModelRow[];
  statusValues: { value: string; count: number }[];
  recommendations: Recommendation[];
}

const fmtUsd = (n: number, d = 2) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function distinctValues(csv: ParsedCsv, col: number, cap = 24): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of csv.rows) {
    const v = (r[col] ?? "").trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
    if (counts.size > cap) break;
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export function runWorkbench(
  activity: ParsedCsv,
  outcomes: ParsedCsv,
  cfg: WorkbenchConfig
): WorkbenchResult {
  const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

  // Index activity rows by join key.
  const byKey = new Map<string, number[]>();
  let runsWithKey = 0;
  activity.rows.forEach((r, i) => {
    const k = norm(r[cfg.activityKeyCol]);
    if (!k) return;
    runsWithKey++;
    const list = byKey.get(k);
    if (list) list.push(i);
    else byKey.set(k, [i]);
  });

  const passes = (r: string[]) =>
    cfg.statusCol === -1 || cfg.passValues.size === 0
      ? true
      : cfg.passValues.has((r[cfg.statusCol] ?? "").trim());

  const claimed = outcomes.rows.length;
  let verified = 0;
  let joined = 0;

  // Per-agent / per-model tallies.
  const agentAgg = new Map<string, { runs: number; outcomesJoined: number; verifiedJoined: number; cost: number }>();
  const modelAgg = new Map<string, { runs: number; verifiedJoined: number; cost: number }>();
  const getAgent = (r: string[]) =>
    cfg.agentCol === -1 ? "(all agents)" : (r[cfg.agentCol] ?? "").trim() || "(blank)";
  const getModel = (r: string[]) =>
    cfg.modelCol === -1 ? null : (r[cfg.modelCol] ?? "").trim() || "(blank)";
  const getCost = (r: string[]) => {
    if (cfg.costCol === -1) return 0;
    const v = parseFloat((r[cfg.costCol] ?? "").replace(/[$,]/g, ""));
    return Number.isFinite(v) ? v : 0;
  };

  let totalCost = 0;
  for (const r of activity.rows) {
    const a = getAgent(r);
    const m = getModel(r);
    const c = getCost(r);
    totalCost += c;
    const aa = agentAgg.get(a) ?? { runs: 0, outcomesJoined: 0, verifiedJoined: 0, cost: 0 };
    aa.runs++;
    aa.cost += c;
    agentAgg.set(a, aa);
    if (m !== null) {
      const ma = modelAgg.get(m) ?? { runs: 0, verifiedJoined: 0, cost: 0 };
      ma.runs++;
      ma.cost += c;
      modelAgg.set(m, ma);
    }
  }

  let outcomesWithNoActivity = 0;
  for (const o of outcomes.rows) {
    const ok = passes(o);
    if (ok) verified++;
    const k = norm(o[cfg.outcomeKeyCol]);
    const matches = k ? byKey.get(k) : undefined;
    if (matches && matches.length > 0) {
      if (ok) {
        joined++;
        // Credit the first matching run's agent/model (deterministic rule).
        const run = activity.rows[matches[0]];
        const aa = agentAgg.get(getAgent(run))!;
        aa.outcomesJoined++;
        aa.verifiedJoined++;
        const m = getModel(run);
        if (m !== null) modelAgg.get(m)!.verifiedJoined++;
      } else {
        const run = activity.rows[matches[0]];
        agentAgg.get(getAgent(run))!.outcomesJoined++;
      }
    } else {
      outcomesWithNoActivity++;
    }
  }

  const hasCost = cfg.costCol !== -1;
  const agents: AgentRow[] = [...agentAgg.entries()]
    .map(([agent, a]) => ({
      agent,
      runs: a.runs,
      outcomesJoined: a.outcomesJoined,
      verifiedJoined: a.verifiedJoined,
      cost: hasCost ? a.cost : null,
      costPerVerified: hasCost && a.verifiedJoined > 0 ? a.cost / a.verifiedJoined : null,
    }))
    .sort((a, b) => b.runs - a.runs);

  const models: ModelRow[] = [...modelAgg.entries()]
    .map(([model, m]) => ({
      model,
      runs: m.runs,
      verifiedJoined: m.verifiedJoined,
      costPerVerified: hasCost && m.verifiedJoined > 0 ? m.cost / m.verifiedJoined : null,
    }))
    .sort((a, b) => b.runs - a.runs);

  const joinCoveragePct = verified === 0 ? 0 : Math.round((joined / verified) * 100);
  const keyCoveragePct =
    activity.rows.length === 0 ? 0 : Math.round((runsWithKey / activity.rows.length) * 100);

  // Deterministic recommendations — grade D, rules. Each one is an action.
  const recommendations: Recommendation[] = [];
  if (joinCoveragePct < 85 && verified > 0) {
    recommendations.push({
      kind: "join",
      line: `Improve the join key: ${100 - joinCoveragePct}% of verified outcomes have no matching run.`,
      detail:
        "Map the outcome ID into the agent's tool-call payload, or export an additional key column. Coverage is the number to move first — everything downstream inherits it.",
    });
  }
  if (models.length >= 2) {
    const priced = models.filter((m) => m.costPerVerified !== null && m.verifiedJoined >= 5);
    if (priced.length >= 2) {
      const sorted = [...priced].sort((a, b) => a.costPerVerified! - b.costPerVerified!);
      const cheap = sorted[0];
      const dear = sorted[sorted.length - 1];
      if (dear.costPerVerified! > cheap.costPerVerified! * 1.3) {
        recommendations.push({
          kind: "reroute",
          line: `Reroute candidate: ${dear.model} costs ${fmtUsd(dear.costPerVerified!)} per verified outcome vs. ${cheap.model} at ${fmtUsd(cheap.costPerVerified!)}.`,
          detail:
            "Same quality bar on both slices? Route the standard case to the cheaper model and re-verify in two weeks. If quality differs, this is a natural experiment — grade B evidence, already running.",
        });
      }
    }
  }
  for (const a of agents) {
    if (a.runs >= 10 && a.outcomesJoined === 0 && agents.length > 1) {
      recommendations.push({
        kind: "unverified",
        line: `Unverified activity: ${a.agent} ran ${a.runs.toLocaleString("en-US")} times with no outcome landing on this join key.`,
        detail:
          "Either its outcomes land in a system not in this export, or nothing is landing. Define its outcome contract — event, quality bar, counterfactual — before renewing anything.",
      });
    }
  }
  if (outcomesWithNoActivity > 0 && joined > 0) {
    recommendations.push({
      kind: "baseline",
      line: `${outcomesWithNoActivity.toLocaleString("en-US")} outcomes had no agent run — that slice is your baseline.`,
      detail:
        "Work that lands without the agents is the counterfactual hiding in your own export. Compare cost and quality against it before crediting the fleet.",
    });
  }
  if (cfg.statusCol !== -1 && cfg.passValues.size > 0 && claimed > 0) {
    const failPct = Math.round(((claimed - verified) / claimed) * 100);
    if (failPct >= 5) {
      recommendations.push({
        kind: "quality",
        line: `${failPct}% of claimed outcomes fail your quality bar.`,
        detail:
          "If a vendor bills on the claimed count, this gap is your adjustment. Price it per unit and put it in the next conversation.",
      });
    }
  }

  return {
    activityRows: activity.rows.length,
    outcomeRows: outcomes.rows.length,
    runsWithKey,
    claimed,
    verified,
    joined,
    joinCoveragePct,
    keyCoveragePct,
    totalCost: hasCost ? totalCost : null,
    costPerVerifiedJoined: hasCost && joined > 0 ? totalCost / joined : null,
    agents,
    models,
    statusValues: [],
    recommendations,
  };
}
