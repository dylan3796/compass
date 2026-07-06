/**
 * Statement-level behavior: the evidence-grade ceiling is for MISSING design
 * data only. Integrity violations (a contaminated holdout) must fail the
 * whole statement loudly — never quietly degrade into a more generous verdict.
 */
import { describe, expect, it } from "vitest";
import { runStatement, type EngineConfig } from "@/lib/engine/statement";
import type { EngineInputs } from "@/lib/engine/types";
import { AGENT, HOUR, HUMAN, T0, TICKET_RULES, claimRun, ev, iso, makeContract, touchRun } from "./helpers";

function microConfig(): EngineConfig {
  return {
    contracts: [
      makeContract({
        billing: { kind: "flatMonthly", feeCents: 10000 },
        counterfactual: { kind: "holdout", experimentId: "hx", treatedArm: "treated", controlArm: "control" },
      }),
    ],
    extractRuleSets: [TICKET_RULES],
    verdictRules: [
      {
        id: "hold",
        verdict: "EXPAND",
        priority: 1,
        when: { op: "exists", metric: "qualityPassPct" },
        impact: { kind: "flatFeeRecovery" },
      },
    ],
    activitySourceLabels: { langsmith: "LangSmith", log_upload: "Log upload" },
    boundaryWindowDays: 30,
  };
}

function microInputs(outcomeExtras: Parameters<typeof ev>[3] extends never ? never : "withArms" | "noArms") {
  const withArms = outcomeExtras === "withArms";
  const inputs: EngineInputs = {
    periodStart: iso(T0),
    periodEnd: iso(T0 + 30 * 24 * HOUR),
    actors: [AGENT, HUMAN],
    runs: [claimRun("t1", T0)],
    outcomes: [
      ev("t1", "created", T0, withArms ? { experimentId: "hx", arm: "treated" } : undefined),
      ev("t1", "resolved", T0 + HOUR),
      ev("c1", "created", T0, withArms ? { experimentId: "hx", arm: "control" } : undefined),
    ],
  };
  return inputs;
}

describe("evidence-grade ceiling vs integrity violations", () => {
  it("missing design data downgrades to Grade D and says so", () => {
    const statement = runStatement(microInputs("noArms"), microConfig());
    const wf = statement.workflows[0];
    expect(wf.estimator.grade).toBe("D");
    expect(wf.estimator.notes.join(" ")).toMatch(/Evidence-grade ceiling/);
    expect(wf.verified).toBe(1);
  });

  it("a contaminated holdout fails the statement instead of degrading quietly", () => {
    const inputs = microInputs("withArms");
    inputs.runs = [...inputs.runs, touchRun(AGENT.id, "c1", T0 + HOUR)]; // agent touches the control arm
    expect(() => runStatement(inputs, microConfig())).toThrow(/exclusion violated/);
  });

  it("with recorded arms intact, the holdout estimator runs at Grade A", () => {
    const statement = runStatement(microInputs("withArms"), microConfig());
    expect(statement.workflows[0].estimator.grade).toBe("A");
  });
});
