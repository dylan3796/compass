/**
 * Estimator dispatch. Grades attach to the DESIGN, not the formula — the
 * same two-group arithmetic is Grade A when the control was reserved in
 * advance and Grade B when it was mined from a change already made.
 * Attribution is an integer counterfactual count, rounded exactly once (R1),
 * so integer ledgers reconcile: attributable = clamp(verified − cf, 0, verified).
 */
import type { ContributionGraph } from "../join/graph";
import type { EstimatorResult, VerificationReport } from "../types";
import { EngineError } from "../types";
import { estimateHoldout } from "./holdout";
import { estimateDidStagedRollout, estimateTwoGroupRoutingGap } from "./did";
import { estimatePreAgentBaseline } from "./baseline";
import { estimateRules } from "./rules";

export function estimate(graph: ContributionGraph, report: VerificationReport): EstimatorResult {
  const design = graph.contract.counterfactual;
  switch (design.kind) {
    case "holdout":
      return estimateHoldout(graph, report, design);
    case "naturalExperiment":
      return design.form === "didStagedRollout"
        ? estimateDidStagedRollout(graph, report, design)
        : estimateTwoGroupRoutingGap(graph, report, design);
    case "preAgentBaseline":
      return estimatePreAgentBaseline(report, design);
    case "rules":
      return estimateRules(graph, report, design);
    default: {
      const never: never = design;
      throw new EngineError("estimate", `unknown counterfactual design ${JSON.stringify(never)}`);
    }
  }
}
