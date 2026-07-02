"use client";

import { useState } from "react";
import { workflows } from "@/lib/data";
import type { Grade } from "@/lib/data";
import { GradeChip, OriginBadge } from "@/components/chips";
import { Reveal, Stamp } from "@/components/motion";

const BASELINES: { value: string; label: string; grade: Grade; note: string }[] = [
  {
    value: "holdout",
    label: "Holdout",
    grade: "A",
    note: "A slice of work the agent never touches. The cleanest counterfactual.",
  },
  {
    value: "natural",
    label: "Natural experiment",
    grade: "B",
    note: "A staged rollout, model switch, or routing change you already made.",
  },
  {
    value: "historical",
    label: "Historical baseline",
    grade: "C",
    note: "Your pre-agent history, matched and compared.",
  },
  {
    value: "rules",
    label: "Rules",
    grade: "D",
    note: "Deterministic counterfactual logic. Where every engagement starts.",
  },
];

export default function Screen1Define({ onConnect }: { onConnect?: () => void }) {
  const [baseline, setBaseline] = useState(BASELINES[3]);
  const [drafted, setDrafted] = useState(false);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl">Define outcomes</h1>
        <p className="mt-2 text-ink/70">If it lands in a system of record, Causa can verify it.</p>
        <p className="mt-1 text-sm text-ink/60">
          These four contracts didn&rsquo;t start this sharp. Causa read the record first —
          next screen.
        </p>
      </header>

      {/* The contract register */}
      <div className="border border-hairline bg-white/40">
        <div className="rule hidden grid-cols-[2rem_1.4fr_1fr_1fr_1.3fr] gap-4 border-b px-4 py-2 md:grid">
          <span />
          <span className="eyebrow text-ink/60">Outcome</span>
          <span className="eyebrow text-ink/60">Event</span>
          <span className="eyebrow text-ink/60">Quality bar</span>
          <span className="eyebrow text-ink/60">Counterfactual</span>
        </div>
        {workflows.map((w, i) => (
          <Reveal
            key={w.id}
            delay={i * 0.04}
            className="rule grid grid-cols-1 gap-2 border-b px-4 py-4 last:border-b-0 md:grid-cols-[2rem_1.4fr_1fr_1fr_1.3fr] md:gap-4"
          >
            <span className="font-serif text-xl text-ink/60">0{i + 1}</span>
            <span>
              <span className="font-serif text-xl leading-tight">{w.name}</span>
              <span className="mt-1 flex items-center gap-2">
                <OriginBadge origin={w.origin} />
              </span>
            </span>
            <span className="text-sm">
              <span className="eyebrow block text-ink/60 md:hidden">Event</span>
              {w.contract.event}
            </span>
            <span className="text-sm">
              <span className="eyebrow block text-ink/60 md:hidden">Quality bar</span>
              {w.contract.qualityBar}
            </span>
            <span className="flex items-start gap-2 text-sm">
              <span>
                <span className="eyebrow block text-ink/60 md:hidden">Counterfactual</span>
                {w.contract.counterfactual}
              </span>
              <GradeChip grade={w.grade} />
            </span>
          </Reveal>
        ))}
      </div>

      {/* Custom outcome form — teaches the causality ladder */}
      <Reveal className="mt-10 border border-hairline bg-white/40 p-5">
        <h2 className="font-serif text-xl">Add an outcome</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setDrafted(true);
          }}
        >
          <label className="block text-sm">
            <span className="eyebrow text-ink/60">Name</span>
            <input
              type="text"
              placeholder="Refund processed"
              className="mt-1 block min-h-[44px] w-full border border-ink/60 bg-paper px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="eyebrow text-ink/60">System of record</span>
            <input
              type="text"
              placeholder="Stripe"
              className="mt-1 block min-h-[44px] w-full border border-ink/60 bg-paper px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="eyebrow text-ink/60">Success event</span>
            <input
              type="text"
              placeholder="Refund issued and case closed"
              className="mt-1 block min-h-[44px] w-full border border-ink/60 bg-paper px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="eyebrow text-ink/60">Quality bar</span>
            <input
              type="text"
              placeholder="No chargeback within 30 days"
              className="mt-1 block min-h-[44px] w-full border border-ink/60 bg-paper px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="eyebrow text-ink/60">Baseline type</span>
            <select
              value={baseline.value}
              onChange={(e) =>
                setBaseline(BASELINES.find((b) => b.value === e.target.value) ?? BASELINES[3])
              }
              className="mt-1 block min-h-[44px] w-full border border-ink/60 bg-paper px-3 py-2 sm:max-w-sm"
            >
              {BASELINES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rule border-t pt-4 sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow text-ink/60">Evidence grade earned</span>
              <span className="flex h-9 w-9 items-center justify-center border-2 border-ink font-serif text-xl">
                {baseline.grade}
              </span>
              <button type="submit" className="btn-outline ml-auto text-sm">
                Draft contract
              </button>
            </div>
            <p className="mt-2 max-w-lg text-sm text-ink/70">{baseline.note}</p>
            {drafted && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Stamp trigger="mount" active>
                  <span className="border-2 border-ink px-2 py-0.5 font-serif text-sm uppercase">
                    Drafted
                  </span>
                </Stamp>
                <p className="text-sm text-ink/70">
                  Verifiable after first sync — connect the source.
                  {onConnect && (
                    <button
                      type="button"
                      onClick={onConnect}
                      className="ml-2 underline underline-offset-4"
                    >
                      Connect sources →
                    </button>
                  )}
                </p>
              </div>
            )}
          </div>
        </form>
      </Reveal>
    </div>
  );
}
