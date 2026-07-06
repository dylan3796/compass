/**
 * Meridian (fictional) · June 2026 — the reconciled data module.
 * Single source of truth per causa-plan.md Part 7. Every number on every
 * screen traces here — and every number here is now ENGINE OUTPUT: the
 * attribution core (lib/engine) derives the full ledger from ~30k synthetic
 * event-level records (activity runs + outcome events) via
 * extract → join → verify → estimate → economics → verdict, and
 * `npm run reconcile` writes it to lib/engine/generated/meridian-ledger.json.
 * Editorial copy stays authored here; the assertion block at the bottom pins
 * the published figures and throws at build time if the engine's math stops
 * reconciling.
 */
import ledgerJson from "@/lib/engine/generated/meridian-ledger.json";
import type { MeridianLedgerJson } from "@/lib/engine/fixtures/meridian";

const ledger = ledgerJson as unknown as MeridianLedgerJson;

function eng(id: string) {
  const w = ledger.workflows.find((x) => x.id === id);
  if (!w) throw new Error(`data.ts: engine ledger has no workflow "${id}"`);
  return w;
}

export type Origin = "BUILT" | "BOUGHT" | "HYBRID";
/** The five stamps (CAUSA.md §4.4). REPRICE is engine-supported; no Meridian row triggers it. */
export type Verdict = "REPRICE" | "RENEGOTIATE" | "EXPAND" | "REROUTE" | "RETIRE";
export type Grade = "A" | "B" | "C" | "D";

const GRADES: readonly string[] = ["A", "B", "C", "D"];
const VERDICTS: readonly string[] = ["REPRICE", "RENEGOTIATE", "EXPAND", "REROUTE", "RETIRE"];

function asGrade(s: string): Grade {
  if (!GRADES.includes(s)) throw new Error(`data.ts: engine emitted unknown grade "${s}"`);
  return s as Grade;
}
function asVerdict(s: string): Verdict {
  if (!VERDICTS.includes(s)) throw new Error(`data.ts: engine emitted unknown verdict "${s}"`);
  return s as Verdict;
}

/** The engine-derived numeric fields of a workflow row; editorial copy stays authored below. */
function fromEngine(id: string) {
  const w = eng(id);
  return {
    claimed: w.claimed,
    verified: w.verified,
    attributable: w.attributable,
    spend: w.spend,
    costPerVerified: w.costPerVerified,
    grade: asGrade(w.grade),
    verdict: asVerdict(w.verdict),
    impactPerMonth: w.impactPerMonth,
    deltaVsMay: w.deltaVsMay,
    qualityPassPct: w.qualityPassPct,
    sparkline: w.sparkline,
    modelSplit: w.modelSplit,
  };
}

export interface ModelSplit {
  model: string;
  costPerVerified: number;
  /** Share of the row's verified outcomes handled by this model (for micro bar widths). */
  share: number;
}

export interface Workflow {
  id: string;
  name: string;
  origin: Origin;
  /** The actor behind the outcomes — every outcome ties back to a doer. */
  actor: string;
  claimed: number;
  verified: number;
  attributable: number;
  spend: number;
  costPerVerified: number;
  grade: Grade;
  gradeLabel: string;
  verdict: Verdict;
  verdictLabel: string;
  impactPerMonth: number;
  /** Δ vs May, in $/verified outcome (negative = cheaper). */
  deltaVsMay: number;
  qualityPassPct: number;
  vsBaseline: string;
  sparkline: number[];
  modelSplit?: ModelSplit[];
  evidence: [string, string];
  contract: { event: string; qualityBar: string; counterfactual: string };
}

export const company = {
  name: "Meridian",
  period: "June 2026",
  headcount: 140,
} as const;

export const headers = {
  claimed: ledger.headers.claimed,
  verified: ledger.headers.verified,
  attributable: ledger.headers.attributable,
  spend: ledger.headers.spend,
  adjustmentIdentified: ledger.headers.adjustmentIdentified,
  projectedVerdictImpact: ledger.headers.projectedVerdictImpact,
};

export const workflows: Workflow[] = [
  {
    id: "support",
    name: "Support tickets",
    origin: "BOUGHT",
    actor: "Vendor support agent · claude-fable-5 + gpt-5",
    ...fromEngine("support"),
    gradeLabel: "A (10% holdout)",
    verdictLabel: "RENEGOTIATE",
    vsBaseline: "71% incremental vs. holdout",
    evidence: [
      "Billed $1.50/resolution; 71% of verified resolutions incremental vs. the 10% holdout (1,989 / 2,802).",
      "Fair price at 71% incrementality: $1.06. 61 reopens within 7 days → $91.50 adjustment.",
    ],
    contract: {
      event: "Ticket resolved in Zendesk",
      qualityBar: "No reopen within 7 days",
      counterfactual: "10% holdout slice the agent never touches",
    },
  },
  {
    id: "workspace",
    name: "New-hire accounts",
    origin: "BUILT",
    actor: "In-house account agent",
    ...fromEngine("workspace"),
    gradeLabel: "C (12-mo baseline)",
    verdictLabel: "EXPAND",
    vsBaseline: "$0.42 vs. $11.90 under the old process",
    evidence: [
      "$0.42/account vs. $11.90 under the old process; 2.1 days → 4 minutes. 100% quality bar.",
      "Cloning the agent for contractor onboarding ≈ $2,140/mo additional savings.",
    ],
    contract: {
      event: "New-hire account live in ServiceNow",
      qualityBar: "User active within 48 hours",
      counterfactual: "12-month pre-agent baseline, matched",
    },
  },
  {
    id: "docgen",
    name: "Meeting notes → Jira tickets",
    origin: "BUILT",
    actor: "In-house notes agent · claude-fable-5 + qwen-3",
    ...fromEngine("docgen"),
    gradeLabel: "B (model switch)",
    verdictLabel: "REROUTE",
    vsBaseline: "94% acceptance, both slices",
    evidence: [
      "94% of tickets accepted (601 / 640). Marginal cost $3.10 on claude-fable-5 vs. $1.21 on the qwen-3 pilot slice at the same acceptance rate.",
      "Rerouting saves $1.89 × 570 ≈ $1,077/mo.",
    ],
    contract: {
      event: "Jira ticket created from meeting notes",
      qualityBar: "Accepted by assignee without rewrite",
      counterfactual: "Model-switch natural experiment (pilot slice)",
    },
  },
  {
    id: "meetings",
    name: "Sales meetings booked",
    origin: "HYBRID",
    actor: "Vendor SDR agent + 3 reps",
    ...fromEngine("meetings"),
    gradeLabel: "B (staged rollout)",
    verdictLabel: "RETIRE agent slice",
    vsBaseline: "8% agent-only vs. 11% without it",
    evidence: [
      "Verified = opportunity created within 14 days (314 / 472). Only the human-assisted slice beats the counterfactual (attributable 118).",
      "Meetings from the agent-only slice convert 8% vs. an 11% baseline without it. The 118 attributable outcomes came from the assisted slice — a playbook the team keeps. Retiring the agent recovers the $2,900/mo fee.",
    ],
    contract: {
      event: "Opportunity created in Salesforce within 14 days",
      qualityBar: "Meeting held; opportunity accepted by rep",
      counterfactual: "Staged-rollout natural experiment",
    },
  },
];

/** The hybrid Meetings row's activity split — touch-count credit over the contribution graph. */
export const meetingsAttributionSplit = {
  agent: ledger.meetingsAttributionSplit.agent,
  human: ledger.meetingsAttributionSplit.human,
};

/** Support dispute row — the engine's fair-price chain, verbatim. */
export const dispute = {
  claimed: ledger.dispute.claimed,
  reopenedWithin7Days: ledger.dispute.reopenedWithin7Days,
  adjustment: ledger.dispute.adjustment,
  billedPerResolution: ledger.dispute.billedPerResolution,
  fairPrice: ledger.dispute.fairPrice,
  incrementalityPct: ledger.dispute.incrementalityPct,
  renegotiationDeltaPerResolution: ledger.dispute.renegotiationDeltaPerResolution,
};

/** Screen 4 closing teaser — the only Benchmark surface that exists. */
export const benchmarkTeaser = {
  yourCostPerResolvedTicket: ledger.benchmark.yourCostPerResolvedTicket,
  benchmarkMedian: 1.42,
  percentile: 71,
};

/** Screen 2 connect state. */
export const connect = {
  runs: ledger.connect.runs,
  windowDays: ledger.connect.windowDays,
  jiraJoinablePct: ledger.connect.jiraJoinablePct,
};

/**
 * Source catalog — what Causa actually reads from each system.
 * Activity sources yield runs; outcome sources yield specific events
 * in the system of record. The events are the product.
 */
export interface SourceTile {
  name: string;
  kind: "activity" | "outcome";
  /** What connecting this source gives Causa, stated as ledger annotation. */
  reads: string;
  /** Connected-state line. Outcome sources count events, never runs. */
  connected: string;
  partial?: boolean;
}

// Activity run counts sum to the canonical 14,203 (asserted below).
export const activityRuns: Record<"LangSmith" | "Langfuse" | "OpenTelemetry" | "Log upload", number> = {
  LangSmith: ledger.activityRuns["LangSmith"],
  Langfuse: ledger.activityRuns["Langfuse"],
  OpenTelemetry: ledger.activityRuns["OpenTelemetry"],
  "Log upload": ledger.activityRuns["Log upload"],
};

export const sources: SourceTile[] = [
  // Log upload leads: it's the on-ramp everyone has, not just engineers.
  {
    name: "Log upload",
    kind: "activity",
    reads: "One CSV export of agent activity — from your vendor's dashboard or wherever your agent runs",
    connected: `Connected — ${activityRuns["Log upload"].toLocaleString("en-US")} rows · join key detected: ticket_id`,
  },
  {
    name: "LangSmith",
    kind: "activity",
    reads: "Agent runs: who ran, when, which model, against which entity",
    connected: `Connected — ${activityRuns.LangSmith.toLocaleString("en-US")} runs · 30 days`,
  },
  {
    name: "Langfuse",
    kind: "activity",
    reads: "Agent runs: who ran, when, which model, against which entity",
    connected: `Connected — ${activityRuns.Langfuse.toLocaleString("en-US")} runs · 30 days`,
  },
  {
    name: "OpenTelemetry",
    kind: "activity",
    reads: "GenAI spans from your existing collector",
    connected: `Connected — ${activityRuns.OpenTelemetry.toLocaleString("en-US")} spans · 30 days`,
  },
  {
    name: "Zendesk",
    kind: "outcome",
    reads: "Ticket resolved · reopened within 7 days · CSAT attached",
    connected: "Connected — 3,214 tickets resolved · joins on ticket_id",
  },
  {
    name: "Salesforce",
    kind: "outcome",
    reads: "Opportunity created · stage advanced · closed-won",
    connected: "Connected — 314 opportunities created · joins on opportunity_id",
  },
  {
    name: "Jira",
    kind: "outcome",
    reads: "Ticket created · accepted by assignee · issue closed",
    connected: "640 tickets created · 61% joinable · improve join key →",
    partial: true,
  },
  {
    name: "ServiceNow",
    kind: "outcome",
    reads: "Account provisioned · incident resolved · user active",
    connected: "Connected — 486 accounts provisioned · joins on employee_email",
  },
  {
    name: "Stripe",
    kind: "outcome",
    reads: "Payment settled · refund processed · invoice adjusted",
    connected: "Connected — 1,208 payments settled · 44 refunds processed",
  },
  {
    name: "Google Drive",
    kind: "outcome",
    reads: "Document created · approved · shared outside the org",
    connected: "Connected — 128 documents approved · joins on doc_id",
  },
];

/** Which workflow each system of record verifies (drives the Screen 2 meter). */
export const recordSystemForWorkflow: Record<string, string> = {
  support: "Zendesk",
  workspace: "ServiceNow",
  docgen: "Jira",
  meetings: "Salesforce",
};

/**
 * Discovered outcomes — the ones Meridian wasn't measuring until Causa read
 * the systems of record. Every figure derives from the Part 7 rows
 * (claimed − verified gaps and the dispute math), so the ledger reconciles.
 */
export interface DiscoveredOutcome {
  source: string;
  finding: string;
  suggestion: string;
  /** Button label — verb + object, ≤3 words. */
  cta: string;
  /** Derivation check where one exists, asserted below. */
  figure: number;
}

export const discoveredOutcomes: DiscoveredOutcome[] = [
  {
    source: "Stripe",
    finding:
      "44 refunds processed trace back to the support agent's runs. No outcome contract covers refunds.",
    suggestion: "Define refund processed as an outcome",
    cta: "Define outcome",
    figure: ledger.discoveredFigures.stripeRefunds,
  },
  {
    source: "Zendesk",
    finding:
      "9% of agent-resolved tickets come back after day 7 — outside the 7-day quality bar.",
    suggestion: "Tighten the quality bar to 14 days",
    cta: "Tighten quality bar",
    figure: ledger.discoveredFigures.lateReopenPct,
  },
  {
    source: "Jira",
    finding:
      "39 tickets created from meetings were rejected by their assignees. Rejections weren't counted.",
    suggestion: "Count acceptance, not creation",
    cta: "Add outcome",
    figure: ledger.discoveredFigures.jiraRejections,
  },
];

export const gradeDescriptions: Record<Grade, { name: string; line: string }> = {
  A: {
    name: "Held out",
    line: "A slice of work your agents never touch. The cleanest counterfactual in commerce.",
  },
  B: {
    name: "Natural experiment",
    line: "Staged rollouts, model switches, routing changes — every change you've already made is an experiment. We mine them.",
  },
  C: { name: "Baseline", line: "Your pre-agent history, matched and compared." },
  D: {
    name: "Rules",
    line: "Rules-based comparison. Where every engagement starts. Never where it has to end.",
  },
};

/**
 * Public market facts cited on the landing page (not Meridian ledger data).
 * Sources: Intercom/Fin public pricing ($0.99/resolution); Salesforce's ~$3.6B
 * acquisition of Fin (June 2026); Ramp AI Index (April & June 2026, 70,000+
 * businesses): median monthly company AI spend $2,246 vs. top-1% firms at
 * ~$7,450 per employee per month.
 */
export const market = {
  finPerResolution: 0.99,
  finAcquisitionBn: 3.6,
  medianMonthlyAiSpend: 2246,
  top1PctPerEmployeeMonthly: 7450,
} as const;

/** Verdict impact split: recovered now vs. additional if EXPAND is acted on. */
export const impactSplit = {
  recovered: workflows
    .filter((w) => w.verdict !== "EXPAND")
    .reduce((acc, w) => acc + w.impactPerMonth, 0),
  expandable: workflows
    .filter((w) => w.verdict === "EXPAND")
    .reduce((acc, w) => acc + w.impactPerMonth, 0),
};

/* ------------------------------------------------------------------ */
/* Assertion block — throws at build time if the ledger doesn't       */
/* reconcile. Do not remove; failing loudly is the product behaving.  */
/* ------------------------------------------------------------------ */

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`data.ts reconciliation failed: ${message}`);
  }
}

const sum = (pick: (w: Workflow) => number) =>
  workflows.reduce((acc, w) => acc + pick(w), 0);

for (const w of workflows) {
  assert(
    w.claimed >= w.verified && w.verified >= w.attributable,
    `${w.name}: claimed ≥ verified ≥ attributable violated (${w.claimed} / ${w.verified} / ${w.attributable})`
  );
}

assert(sum((w) => w.claimed) === headers.claimed, `claimed sum ≠ ${headers.claimed}`);
assert(sum((w) => w.verified) === headers.verified, `verified sum ≠ ${headers.verified}`);
assert(
  sum((w) => w.attributable) === headers.attributable,
  `attributable sum ≠ ${headers.attributable}`
);
assert(sum((w) => w.spend) === headers.spend, `spend sum ≠ $${headers.spend}`);
assert(
  sum((w) => w.impactPerMonth) === headers.projectedVerdictImpact,
  `verdict impacts must total $${headers.projectedVerdictImpact} exactly`
);

// Discovered outcomes derive from the ledger where a derivation exists.
const support = workflows.find((w) => w.id === "support")!;
const docgen = workflows.find((w) => w.id === "docgen")!;
assert(
  discoveredOutcomes[2].figure === docgen.claimed - docgen.verified,
  "Jira discovery must equal notes-agent claimed − verified"
);
assert(
  support.claimed - support.verified === 412,
  "support claims that didn't hold up must be 412"
);
assert(
  Object.values(activityRuns).reduce((a, b) => a + b, 0) === connect.runs,
  `activity source runs must sum to ${connect.runs}`
);
assert(
  impactSplit.recovered + impactSplit.expandable === headers.projectedVerdictImpact,
  "impact split must reconcile to the projected verdict impact"
);

/* ------------------------------------------------------------------ */
/* Golden pins — the published Part 7 ledger, as literals. Everything  */
/* above is engine-derived; if the attribution core drifts from the    */
/* published statement by a single unit, the build fails here.         */
/* ------------------------------------------------------------------ */

const published = {
  headers: {
    claimed: 4812,
    verified: 4203,
    attributable: 3163,
    spend: 9909,
    adjustmentIdentified: 91.5,
    projectedVerdictImpact: 7350,
  },
  rows: {
    support: {
      claimed: 3214, verified: 2802, attributable: 1989, spend: 4821, costPerVerified: 1.72,
      grade: "A", verdict: "RENEGOTIATE", impactPerMonth: 1233, deltaVsMay: -0.06, qualityPassPct: 87,
    },
    workspace: {
      claimed: 486, verified: 486, attributable: 486, spend: 204, costPerVerified: 0.42,
      grade: "C", verdict: "EXPAND", impactPerMonth: 2140, deltaVsMay: -0.01, qualityPassPct: 100,
    },
    docgen: {
      claimed: 640, verified: 601, attributable: 570, spend: 1984, costPerVerified: 3.3,
      grade: "B", verdict: "REROUTE", impactPerMonth: 1077, deltaVsMay: 0.04, qualityPassPct: 94,
    },
    meetings: {
      claimed: 472, verified: 314, attributable: 118, spend: 2900, costPerVerified: 9.24,
      grade: "B", verdict: "RETIRE", impactPerMonth: 2900, deltaVsMay: 0.41, qualityPassPct: 67,
    },
  },
  modelSplit: {
    support: [
      { model: "claude-fable-5", costPerVerified: 1.19, share: 0.62 },
      { model: "gpt-5", costPerVerified: 1.31, share: 0.38 },
    ],
    docgen: [
      { model: "claude-fable-5", costPerVerified: 3.1, share: 0.85 },
      { model: "qwen-3", costPerVerified: 1.21, share: 0.15 },
    ],
  },
  dispute: {
    claimed: 3214, reopenedWithin7Days: 61, adjustment: 91.5, billedPerResolution: 1.5,
    fairPrice: 1.06, incrementalityPct: 71, renegotiationDeltaPerResolution: 0.44,
  },
  meetingsSplit: { agent: 0.62, human: 0.38 },
  activityRuns: { LangSmith: 8912, Langfuse: 2145, OpenTelemetry: 1659, "Log upload": 1487 },
  connect: { runs: 14203, jiraJoinablePct: 61 },
  discoveredFigures: [44, 9, 39],
  benchmarkYourCost: 1.19,
} as const;

for (const [key, value] of Object.entries(published.headers)) {
  assert(
    headers[key as keyof typeof headers] === value,
    `engine drift: headers.${key} must equal published ${value}`
  );
}
for (const [id, row] of Object.entries(published.rows)) {
  const w = workflows.find((x) => x.id === id)!;
  for (const [key, value] of Object.entries(row)) {
    assert(
      w[key as keyof typeof row] === value,
      `engine drift: ${id}.${key} must equal published ${value}`
    );
  }
}
for (const [id, split] of Object.entries(published.modelSplit)) {
  const w = workflows.find((x) => x.id === id)!;
  assert(w.modelSplit !== undefined && w.modelSplit.length === split.length, `engine drift: ${id}.modelSplit shape`);
  split.forEach((m, i) => {
    const actual = w.modelSplit![i];
    assert(
      actual.model === m.model && actual.costPerVerified === m.costPerVerified && actual.share === m.share,
      `engine drift: ${id}.modelSplit[${i}] must equal published ${m.model} $${m.costPerVerified} @ ${m.share}`
    );
  });
}
for (const [key, value] of Object.entries(published.dispute)) {
  assert(
    dispute[key as keyof typeof dispute] === value,
    `engine drift: dispute.${key} must equal published ${value}`
  );
}
assert(
  meetingsAttributionSplit.agent === published.meetingsSplit.agent &&
    meetingsAttributionSplit.human === published.meetingsSplit.human,
  "engine drift: meetings attribution split must equal published 0.62 / 0.38"
);
for (const [label, value] of Object.entries(published.activityRuns)) {
  assert(
    activityRuns[label as keyof typeof activityRuns] === value,
    `engine drift: activityRuns.${label} must equal published ${value}`
  );
}
assert(connect.runs === published.connect.runs, `engine drift: connect.runs must equal ${published.connect.runs}`);
assert(
  connect.jiraJoinablePct === published.connect.jiraJoinablePct,
  `engine drift: Jira joinable % must equal ${published.connect.jiraJoinablePct}`
);
assert(connect.windowDays === 30, "engine drift: connect window must stay 30 days");
discoveredOutcomes.forEach((d, i) => {
  assert(
    d.figure === published.discoveredFigures[i],
    `engine drift: discovered outcome ${d.source} figure must equal ${published.discoveredFigures[i]}`
  );
});
assert(
  benchmarkTeaser.yourCostPerResolvedTicket === published.benchmarkYourCost,
  `engine drift: benchmark cost/resolved ticket must equal ${published.benchmarkYourCost}`
);

export const fmt = {
  int: (n: number) => n.toLocaleString("en-US"),
  usd: (n: number, decimals = 0) =>
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
};
