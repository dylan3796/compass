/**
 * The golden acceptance test: the engine must reproduce the published
 * Meridian ledger — every figure — from event-level fixtures, byte-stably.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertMatchesPublished, buildMeridianLedgerJson, runMeridian } from "@/lib/engine/fixtures/meridian";
import { generateMeridianInputs } from "@/lib/engine/fixtures/meridian/generate";
import { MERIDIAN_CONFIG } from "@/lib/engine/fixtures/meridian/config";
import { CELLS } from "@/lib/engine/fixtures/meridian/workbook";
import { runStatement } from "@/lib/engine/statement";
import { canonicalJson, hashValue } from "@/lib/engine/hash";

describe("Meridian golden acceptance", () => {
  it("reproduces every published ledger figure from event-level records", () => {
    expect(() => assertMatchesPublished(buildMeridianLedgerJson())).not.toThrow();
  });

  it("obeys the funnel: claimed ≥ verified ≥ attributable, with every drop accounted", () => {
    for (const w of runMeridian().workflows) {
      expect(w.claimed).toBeGreaterThanOrEqual(w.verified);
      expect(w.verified).toBeGreaterThanOrEqual(w.attributable);
      const accounted =
        w.verified + w.drop.didNotHappen + w.drop.failedQualityBar + w.drop.unjoinable + w.drop.duplicateClaim;
      expect(accounted).toBe(w.claimed);
    }
  });

  it("is deterministic: two full pipeline runs hash identically", () => {
    const a = hashValue(runMeridian());
    const b = hashValue(runStatement(generateMeridianInputs(), MERIDIAN_CONFIG));
    expect(a).toBe(b);
  });

  it("the checked-in generated JSON matches a fresh engine run (no stale codegen)", () => {
    const diskPath = join(__dirname, "..", "..", "lib", "engine", "generated", "meridian-ledger.json");
    const disk = JSON.parse(readFileSync(diskPath, "utf8"));
    expect(canonicalJson(disk)).toBe(canonicalJson(buildMeridianLedgerJson()));
  });

  it("carries the evidence: support's holdout cells are the workbook's, verbatim", () => {
    const support = runMeridian().workflows.find((w) => w.workflowId === "support")!;
    expect(support.estimator.cells).toEqual({
      treated: { n: CELLS.support.treated, k: 2802 },
      control: { n: CELLS.support.holdout, k: CELLS.support.controlResolved - CELLS.support.controlReopened },
    });
    expect(support.estimator.grade).toBe("A");
    expect(support.estimator.interval).toBeDefined();
    // The point estimate must sit inside its own uncertainty interval.
    const inc = support.attributable / support.verified;
    expect(inc).toBeGreaterThanOrEqual(support.estimator.interval!.lo);
    expect(inc).toBeLessThanOrEqual(support.estimator.interval!.hi);
  });

  it("meetings: the negative agent-only slice is clamped, preserved, and drives RETIRE", () => {
    const meetings = runMeridian().workflows.find((w) => w.workflowId === "meetings")!;
    const agentOnly = meetings.estimator.perSlice!.find((s) => s.slice === "agent_only")!;
    const assisted = meetings.estimator.perSlice!.find((s) => s.slice === "assisted")!;
    expect(agentOnly.pointDelta).toBeLessThan(0);
    expect(agentOnly.attributable).toBe(0);
    expect(assisted.attributable).toBe(118);
    expect(meetings.verdict.verdict).toBe("RETIRE");
    expect(meetings.verdict.ruleId).toBe("retire-non-incremental-slice");
  });

  it("every verdict carries a replay record", () => {
    const s = runMeridian();
    for (const w of s.workflows) {
      expect(w.verdict.replay.inputHash).toMatch(/^[0-9a-f]{16}$/);
      expect(w.verdict.replay.configHash).toMatch(/^[0-9a-f]{16}$/);
      expect(w.verdict.replay.engineVersion).toBe(s.engineVersion);
      expect(Object.keys(w.verdict.inputs).length).toBeGreaterThan(0);
    }
  });

  it("estimators declare their assumptions — evidence attached, not implied", () => {
    for (const w of runMeridian().workflows) {
      expect(w.estimator.assumptions.length).toBeGreaterThan(0);
      expect(Object.keys(w.estimator.cells).length).toBeGreaterThan(0);
    }
  });

  it("coverage is honest: 640 of 1,049 notes-agent runs carry the Jira key", () => {
    const docgen = runMeridian().workflows.find((w) => w.workflowId === "docgen")!;
    expect(docgen.coverage.runsTotal).toBe(1049);
    expect(docgen.coverage.runsWithKey).toBe(640);
    expect(docgen.coverage.runKeyPct).toBe(61);
  });
});
