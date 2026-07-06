/**
 * Source hygiene: the causal core is sealed and deterministic. No clocks, no
 * ambient randomness, no locale-dependent formatting inside lib/engine; the
 * engine never ships in the client bundle.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const BANNED: Array<[string, RegExp]> = [
  ["Math.random", /Math\.random\s*\(/],
  ["Date.now", /Date\.now\s*\(/],
  ["argless new Date()", /new Date\(\s*\)/],
  ["toLocaleString", /\.toLocaleString\s*\(/],
];

describe("engine hygiene", () => {
  const engineSources = walk(join(ROOT, "lib", "engine")).filter((f) => f.endsWith(".ts"));

  it("finds the engine sources", () => {
    expect(engineSources.length).toBeGreaterThan(10);
  });

  it("no clock, no ambient randomness, no locale formatting in lib/engine", () => {
    for (const file of engineSources) {
      const src = readFileSync(file, "utf8");
      for (const [label, re] of BANNED) {
        expect(re.test(src), `${label} found in ${file}`).toBe(false);
      }
    }
  });

  it("no component imports the engine — only data.ts consumes the generated JSON", () => {
    const componentSources = walk(join(ROOT, "components")).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".tsx")
    );
    for (const file of componentSources) {
      expect(readFileSync(file, "utf8").includes("lib/engine"), `engine import in ${file}`).toBe(false);
    }
  });

  it("lib/data.ts touches the engine only via the generated JSON and type-only imports", () => {
    const src = readFileSync(join(ROOT, "lib", "data.ts"), "utf8");
    const engineImports = src
      .split("\n")
      .filter((line) => /^import .*lib\/engine/.test(line.trim()));
    expect(engineImports.length).toBeGreaterThan(0);
    for (const line of engineImports) {
      const ok = line.includes("lib/engine/generated/") || line.trimStart().startsWith("import type ");
      expect(ok, `runtime engine import leaked into data.ts: ${line.trim()}`).toBe(true);
    }
  });
});
