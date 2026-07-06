/**
 * The orchestrator — the only composer of the pipeline, in fixed order:
 *   extract → join → verify → estimate → economics → verdict
 * Each stage is a pure function of (records, config). The output is one
 * settled statement: the Claimed → Verified → Attributable funnel per
 * workflow, evidence attached, verdict stamped, replayable.
 */
import type { ExtractRuleSet } from "./extract/extractors";
import { buildGraph, buildOutcomeIndex } from "./join/graph";
import type { ContributionGraph } from "./join/graph";
import { actorSplit } from "./join/contribution";
import { computeCoverage } from "./join/coverage";
import { qualityBoundaryCount, verifyClaims } from "./verify/verify";
import { estimate } from "./causal/estimator";
import { estimateRules } from "./causal/rules";
import { computeDispute, computeEconomics } from "./economics";
import type { VerdictRule } from "./verdict/engine";
import { decideVerdict } from "./verdict/engine";
import { hashValue } from "./hash";
import { ENGINE_VERSION } from "./version";
import type {
  Discovery,
  EngineInputs,
  LedgerStatement,
  OutcomeContract,
  QualityPredicate,
  ReplayRecord,
  SourceId,
  WorkflowStatement,
} from "./types";
import { EngineError, MissingDesignDataError } from "./types";

export interface EngineConfig {
  contracts: OutcomeContract[];
  extractRuleSets: ExtractRuleSet[];
  verdictRules: VerdictRule[];
  /** Display labels for activity sources, e.g. langsmith → "LangSmith". */
  activitySourceLabels: Partial<Record<SourceId, string>>;
  /** Widened window for quality-bar boundary analysis (discoveries). */
  boundaryWindowDays: number;
}

function findNoEventWithinBar(
  bar: QualityPredicate | null
): { eventType: string; days: number } | undefined {
  if (!bar) return undefined;
  if (bar.kind === "noEventWithin") return { eventType: bar.eventType, days: bar.days };
  if (bar.kind === "all") {
    for (const sub of bar.of) {
      const found = findNoEventWithinBar(sub);
      if (found) return found;
    }
  }
  return undefined;
}

export function runStatement(inputs: EngineInputs, config: EngineConfig): LedgerStatement {
  const replay: ReplayRecord = {
    inputHash: hashValue({ actors: inputs.actors, runs: inputs.runs, outcomes: inputs.outcomes }),
    configHash: hashValue(config),
    engineVersion: ENGINE_VERSION,
  };

  const ruleSetById = new Map(config.extractRuleSets.map((rs) => [rs.id, rs]));
  const declaredBySource = new Map<string, Set<string>>();
  for (const contract of config.contracts) {
    for (const t of contract.declaredEventTypes) {
      let set = declaredBySource.get(contract.event.source);
      if (!set) declaredBySource.set(contract.event.source, (set = new Set()));
      set.add(t);
    }
  }
  // A declared type is declared everywhere: unit/assignment/quality carriers
  // must not resurface as "discoveries" under another contract's source.
  const declaredEverywhere = new Set(config.contracts.flatMap((c) => c.declaredEventTypes));

  const workflows: WorkflowStatement[] = [];
  const graphs: ContributionGraph[] = [];
  const discoveries: Discovery[] = [];
  const discoveredEventIds = new Set<string>();

  // Contract-independent indexes over the outcome records, built once.
  const outcomeIndex = buildOutcomeIndex(inputs.outcomes);

  for (const contract of config.contracts) {
    const ruleSet = ruleSetById.get(contract.join.extractorRuleSetId);
    if (!ruleSet) throw new EngineError("extract", `unknown extractor rule set ${contract.join.extractorRuleSetId}`);

    const graph = buildGraph(contract, inputs.runs, outcomeIndex, ruleSet, inputs.actors);
    graphs.push(graph);
    const report = verifyClaims(graph);

    // Causal ladder, with the evidence-grade ceiling fallback: ONLY missing
    // design data downgrades to Grade D (and says so). Integrity violations —
    // a contaminated holdout, join/design disagreement — propagate and fail
    // the statement loudly: a verdict built on corrupted evidence must never
    // degrade quietly into a more generous one.
    let estimatorResult;
    try {
      estimatorResult = estimate(graph, report);
    } catch (err) {
      if (!(err instanceof MissingDesignDataError)) throw err;
      estimatorResult = estimateRules(
        graph,
        report,
        { wouldHaveHappenedAnyway: { op: "or", of: [] } },
        `Evidence-grade ceiling: the configured design's data is missing (${err.message}); downgraded to Grade D rules.`
      );
    }

    const economics = computeEconomics(contract, report, graph.workflowRuns);
    const dispute = computeDispute(contract, report, estimatorResult);
    const verdictCtx = { contract, report, estimator: estimatorResult, economics, dispute };
    const verdict = decideVerdict(config.verdictRules, verdictCtx, replay);

    const verified = report.verified.length;
    if (!(report.claimed >= verified && verified >= estimatorResult.attributable)) {
      throw new EngineError(
        "statement",
        `${contract.workflowId}: claimed ≥ verified ≥ attributable violated (${report.claimed}/${verified}/${estimatorResult.attributable})`
      );
    }

    workflows.push({
      workflowId: contract.workflowId,
      claimed: report.claimed,
      verified,
      attributable: estimatorResult.attributable,
      drop: report.drop,
      qualityFailures: report.qualityFailures,
      qualityPassPct: report.qualityPassPct,
      spendCents: economics.spendCents,
      costPerVerifiedCents: economics.costPerVerifiedCents,
      modelSplit: economics.modelSplit,
      actorSplit: actorSplit(graph, report.verified),
      estimator: estimatorResult,
      verdict,
      coverage: computeCoverage(graph, report.claimed - report.drop.unjoinable, report.claimed),
      dispute,
    });

    // Discovery: quality-bar boundary — outcomes that come back just past the bar.
    const bar = findNoEventWithinBar(contract.qualityBar);
    if (bar && verified > 0) {
      const count = qualityBoundaryCount(graph, report.verified, bar.eventType, bar.days, config.boundaryWindowDays);
      if (count > 0) {
        discoveries.push({
          source: contract.event.source,
          eventType: bar.eventType,
          count,
          kind: "qualityBarBoundary",
          pctOfVerified: Math.round((100 * count) / verified),
        });
      }
    }

    // Discovery: quality failures nobody prices (no dispute block bills them
    // back). One discovery per failure reason — reasons never absorb each other.
    if (!dispute) {
      for (const [reason, count] of Object.entries(report.qualityFailures).sort(([a], [b]) =>
        a < b ? -1 : 1
      )) {
        discoveries.push({
          source: contract.event.source,
          eventType: reason,
          count,
          kind: "qualityFailuresUncounted",
        });
      }
    }

    // Discovery: duplicate claims are a billing-integrity finding, not noise.
    if (report.drop.duplicateClaim > 0) {
      discoveries.push({
        source: contract.event.source,
        eventType: contract.event.eventType,
        count: report.drop.duplicateClaim,
        kind: "duplicateClaims",
      });
    }
  }

  // Discovery: joined outcome events no contract covers — outcomes the
  // customer wasn't measuring, surfaced by reading the systems of record.
  const uncontracted = new Map<string, Discovery>();
  for (const graph of graphs) {
    for (const [entKey, touches] of graph.touchesByEntity) {
      if (touches.length === 0) continue;
      for (const ev of graph.eventsByEntity.get(entKey) ?? []) {
        if (declaredEverywhere.has(ev.eventType)) continue;
        if (declaredBySource.get(ev.source)?.has(ev.eventType)) continue;
        if (discoveredEventIds.has(ev.id)) continue;
        discoveredEventIds.add(ev.id);
        const key = `${ev.source}:${ev.eventType}`;
        const existing = uncontracted.get(key);
        if (existing) existing.count += 1;
        else uncontracted.set(key, { source: ev.source, eventType: ev.eventType, count: 1, kind: "uncontractedJoinedEvents" });
      }
    }
  }
  discoveries.push(...[...uncontracted.values()].sort((a, b) => b.count - a.count));

  const activityRunsBySource: Record<string, number> = {};
  for (const run of inputs.runs) {
    const label = config.activitySourceLabels[run.source];
    if (!label) throw new EngineError("statement", `activity run ${run.id} has unlabeled source ${run.source}`);
    activityRunsBySource[label] = (activityRunsBySource[label] ?? 0) + 1;
  }

  const sum = (pick: (w: WorkflowStatement) => number) => workflows.reduce((acc, w) => acc + pick(w), 0);
  return {
    engineVersion: ENGINE_VERSION,
    replay,
    headers: {
      claimed: sum((w) => w.claimed),
      verified: sum((w) => w.verified),
      attributable: sum((w) => w.attributable),
      spendCents: sum((w) => w.spendCents),
      adjustmentCents: sum((w) => w.dispute?.adjustmentCents ?? 0),
      projectedVerdictImpactDollars: sum((w) => w.verdict.impactPerMonthDollars),
    },
    workflows,
    discoveries,
    activityRunsBySource,
    totalRuns: inputs.runs.length,
  };
}
