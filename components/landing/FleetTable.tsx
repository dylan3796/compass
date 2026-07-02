"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { fmt, workflows } from "@/lib/data";
import { GradeChip, OriginBadge } from "@/components/chips";

type Filter = "All" | "Built" | "Bought";

export default function FleetTable() {
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("All");

  const rows = useMemo(() => {
    const filtered = workflows.filter((w) => {
      if (filter === "Built") return w.origin === "BUILT";
      if (filter === "Bought") return w.origin === "BOUGHT";
      return true;
    });
    // Re-rank by $/verified outcome, cheapest first.
    return [...filtered].sort((a, b) => a.costPerVerified - b.costPerVerified);
  }, [filter]);

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Filter fleet"
        className="mb-4 inline-flex border border-ink"
      >
        {(["All", "Built", "Bought"] as const).map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-[44px] px-5 text-sm font-medium transition-colors ${
              filter === f ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-hairline">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="rule border-b text-left">
              <th className="eyebrow sticky left-0 z-10 bg-paper py-2 pl-4 pr-3 font-normal text-ink/60">
                Workflow
              </th>
              <th className="eyebrow px-3 py-2 font-normal text-ink/60">Origin</th>
              <th className="eyebrow px-3 py-2 text-right font-normal text-ink/60">Spend</th>
              <th className="eyebrow px-3 py-2 text-right font-normal text-ink/60">
                Verified outcomes
              </th>
              <th className="eyebrow px-3 py-2 text-right font-normal text-ink/60">
                $ / verified outcome
              </th>
              <th className="eyebrow py-2 pl-3 pr-4 font-normal text-ink/60">Evidence</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((w) => (
                <motion.tr
                  key={w.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="rule border-b last:border-b-0"
                >
                  <td className="sticky left-0 z-10 bg-paper py-2 pl-4 pr-3 font-medium">
                    {w.name}
                  </td>
                  <td className="px-3 py-2">
                    <OriginBadge origin={w.origin} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt.usd(w.spend)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ledger">
                    {fmt.int(w.verified)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    {fmt.usd(w.costPerVerified, 2)}
                  </td>
                  <td className="py-2 pl-3 pr-4">
                    <GradeChip grade={w.grade} label={w.gradeLabel.replace(/^[A-D] /, "")} />
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink/60">
        One standard: verified outcomes per dollar, graded evidence, same ledger.
      </p>
    </div>
  );
}
