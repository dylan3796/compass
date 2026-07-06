/**
 * Codegen: run the attribution engine over the Meridian fixtures, prove the
 * output reconciles with the published ledger, and write it to
 * lib/engine/generated/meridian-ledger.json for lib/data.ts to consume.
 *
 * This runs as `npm run reconcile` (and automatically via prebuild/predev).
 * It fails loudly if any engine-derived number drifts from the published
 * ledger — failing loudly is the product behaving.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertMatchesPublished, buildMeridianLedgerJson, runMeridian } from "../lib/engine/fixtures/meridian";
import { canonicalJson } from "../lib/engine/hash";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "lib", "engine", "generated", "meridian-ledger.json");

const ledger = buildMeridianLedgerJson();
assertMatchesPublished(ledger);
// (The byte-determinism double-run gate lives in the golden test — npm test —
// so the dev/build loop pays for one pipeline execution, not two.)

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(JSON.parse(canonicalJson(ledger)), null, 2) + "\n");

const s = runMeridian();
console.log(
  `reconciled: ${s.headers.claimed} claimed → ${s.headers.verified} verified → ${s.headers.attributable} attributable · ` +
    `$${(s.headers.spendCents / 100).toLocaleString("en-US")} spend · $${s.headers.projectedVerdictImpactDollars.toLocaleString("en-US")}/mo verdict impact · ` +
    `replay ${s.replay.inputHash.slice(0, 8)}/${s.replay.configHash.slice(0, 8)} @ engine ${s.engineVersion}`
);
console.log(`wrote ${outPath}`);
