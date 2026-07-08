"use client";

import { useState } from "react";
import {
  company,
  dispute,
  fmt,
  headers,
  impactSplit,
  meetingsAttributionSplit,
  workflows,
} from "@/lib/data";
import { GradeChip, OriginBadge, Sparkline } from "@/components/chips";
import { CountUp, Reveal, Stamp } from "@/components/motion";

export type Persona = "CFO" | "Team";

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "Why is a meeting $9.24?",
    a: "472 meetings booked; 314 became opportunities within 14 days; only 118 beat the counterfactual. $2,900 spend ÷ 314 verified = $9.24 — and only the assisted slice is beating the baseline. That's what the RETIRE verdict prices.",
  },
  {
    q: "Why did support get cheaper in June?",
    a: "Cost per verified resolution fell $0.06 vs. May: the claude-fable-5 slice ($1.19 marginal) carried more of the volume than gpt-5 ($1.31). Verified volume held at 2,802.",
  },
  {
    q: "What should the notes agent stop doing?",
    a: "Sending every meeting to claude-fable-5. The qwen-3 pilot slice holds the same 94% acceptance at $1.21 vs. $3.10 — reroute standard meetings, keep exec meetings premium. ≈ $1,077/mo.",
  },
];

function AskTheRecord() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div>
      <p className="eyebrow text-ink/60">Ask the record</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUESTIONS.map((item, i) => (
          <button
            key={item.q}
            onClick={() => setActive(active === i ? null : i)}
            aria-expanded={active === i}
            className={`min-h-[44px] border px-3 py-1.5 text-left font-mono text-xs transition-colors ${
              active === i ? "border-ink bg-white/60" : "border-hairline hover:border-ink/60"
            }`}
          >
            &ldquo;{item.q}&rdquo;
          </button>
        ))}
      </div>
      {active !== null && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/80">
          {QUESTIONS[active].a}
        </p>
      )}
      <p className="mt-2 font-mono text-[10px] text-ink/60">
        Sample questions — every answer computes from the ledger, nothing generated beyond it.
      </p>
    </div>
  );
}

function FunnelStage({
  label,
  value,
  final,
  drop,
}: {
  label: string;
  value: number;
  final?: boolean;
  /** Why the difference from the previous stage fell away. */
  drop?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="eyebrow text-ink/60">{label}</p>
      <p className={`font-serif text-3xl sm:text-4xl ${final ? "text-ledger" : ""}`}>
        <CountUp value={value} />
      </p>
      {drop && <p className="mt-1 font-mono text-[10px] text-ink/60">{drop}</p>}
    </div>
  );
}

export default function Screen3Statement({
  persona,
  onPersona,
}: {
  persona: Persona;
  onPersona: (p: Persona) => void;
}) {
  const [pushed, setPushed] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const impactPctOfSpend = Math.round(
    (headers.projectedVerdictImpact / headers.spend) * 100
  );

  return (
    <div>
      {/* Shared header */}
      <header className="mb-6">
        <p className="eyebrow text-ink/60">
          {company.name} · {company.period} · Agent spend {fmt.usd(headers.spend)}
        </p>
        <h1 className="mt-1 font-serif text-3xl sm:text-4xl">Verified Outcome Statement</h1>
      </header>

      {/* State-driven settlement funnel */}
      <div className="rule grid grid-cols-3 gap-4 border-y py-5">
        <FunnelStage label="Claimed" value={headers.claimed} />
        <FunnelStage
          label="Verified"
          value={headers.verified}
          drop={`−${fmt.int(headers.claimed - headers.verified)} failed the quality bar`}
        />
        <FunnelStage
          label="Attributable"
          value={headers.attributable}
          final
          drop={`−${fmt.int(headers.verified - headers.attributable)} would have happened anyway`}
        />
      </div>

      {/* The most persuasive stat in the demo — unmissable */}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="text-[15px]">
          Adjustment identified:{" "}
          <span className="font-medium">{fmt.usd(headers.adjustmentIdentified, 2)}</span>
        </p>
        <p className="text-[15px]">
          Projected verdict impact:{" "}
          <span className="font-serif text-2xl text-verdict sm:text-3xl">
            {fmt.usd(headers.projectedVerdictImpact)}/mo — {impactPctOfSpend}% of spend
          </span>
        </p>
        <p className="w-full font-mono text-[10px] text-ink/60">
          {fmt.usd(impactSplit.recovered)} recovered by repricing, rerouting, and retiring ·{" "}
          {fmt.usd(impactSplit.expandable)} more if the onboarding agent is cloned
        </p>
      </div>

      {/* Ask the record — sample questions, answers computed from the ledger */}
      <div className="rule mt-6 border-y py-4">
        <AskTheRecord />
      </div>

      {/* Persona toggle */}
      <div
        role="tablist"
        aria-label="Statement view"
        className="mt-8 inline-flex border border-ink"
      >
        {(["CFO", "Team"] as const).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={persona === p}
            onClick={() => onPersona(p)}
            className={`min-h-[44px] px-6 text-sm font-medium transition-colors ${
              persona === p ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {persona === "CFO" ? (
        <Reveal className="mt-6">
          {/* CFO view — the Agent P&L */}
          <div className="overflow-x-auto border border-hairline">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="rule border-b text-left">
                  <th className="sticky left-0 z-10 bg-paper py-3 pl-4 pr-3 font-medium">
                    Workflow
                  </th>
                  <th className="px-3 py-3 font-medium">Origin</th>
                  <th className="px-3 py-3 text-right font-medium">Spend</th>
                  <th className="px-3 py-3 text-right font-medium">Verified</th>
                  <th className="px-3 py-3 text-right font-medium">$ / verified outcome</th>
                  <th className="px-3 py-3 font-medium">By model (marginal cost)</th>
                  <th className="py-3 pl-3 pr-4 text-right font-medium">Δ vs May</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => {
                  const disputed = w.id === "support";
                  return (
                    <tr
                      key={w.id}
                      className={`rule border-b last:border-b-0 ${disputed ? "bg-verdict/5" : ""}`}
                    >
                      <td
                        className={`sticky left-0 z-10 py-3 pl-4 pr-3 font-medium ${
                          disputed ? "bg-verdict-tint" : "bg-paper"
                        }`}
                      >
                        {w.name}
                        {disputed && (
                          <span className="mt-1 block max-w-[190px] whitespace-normal text-xs font-normal text-ink/80">
                            Vendor claimed {fmt.int(dispute.claimed)} resolutions ·{" "}
                            {dispute.reopenedWithin7Days} reopened within 7 days ·{" "}
                            <span className="font-medium">
                              adjustment: {fmt.usd(dispute.adjustment, 2)}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <OriginBadge origin={w.origin} />
                      </td>
                      <td className="px-3 py-3 text-right">{fmt.usd(w.spend)}</td>
                      <td className="px-3 py-3 text-right text-ledger">{fmt.int(w.verified)}</td>
                      <td className="px-3 py-3 text-right">{fmt.usd(w.costPerVerified, 2)}</td>
                      <td className="px-3 py-3">
                        {w.modelSplit ? (
                          <div className="space-y-1">
                            {w.modelSplit.map((m) => {
                              const max = Math.max(
                                ...w.modelSplit!.map((x) => x.costPerVerified)
                              );
                              return (
                                <div key={m.model} className="flex items-center gap-2">
                                  <span className="w-24 shrink-0 font-mono text-[10px] text-ink/60">
                                    {m.model}
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="h-1.5 bg-ink/60"
                                    style={{ width: `${(m.costPerVerified / max) * 56}px` }}
                                  />
                                  <span className="font-mono text-[10px]">
                                    {fmt.usd(m.costPerVerified, 2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-ink/60">—</span>
                        )}
                      </td>
                      {/* Verdict red fails AA below stamp scale; weight carries the cue. */}
                      <td
                        className={`py-3 pl-3 pr-4 text-right ${
                          w.deltaVsMay > 0 ? "font-semibold text-ink" : "text-ink/70"
                        }`}
                      >
                        {w.deltaVsMay >= 0 ? "+" : "−"}
                        {fmt.usd(Math.abs(w.deltaVsMay), 2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-white/50 font-medium">
                  <td className="sticky left-0 z-10 bg-paper-raised py-3 pl-4 pr-3">Total</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right">{fmt.usd(headers.spend)}</td>
                  <td className="px-3 py-3 text-right text-ledger">
                    {fmt.int(headers.verified)}
                  </td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                  <td className="py-3 pl-3 pr-4" />
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-ink/60">
            Column shows billed cost per verified outcome; model bars show marginal model cost
            per verified outcome.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="btn-ink" onClick={() => setDownloaded(true)}>
              Download statement
            </button>
            <button className="btn-outline" onClick={() => setPushed(true)}>
              Push to accounting
            </button>
            {downloaded && (
              <Stamp trigger="mount" active>
                <span className="border-2 border-ink px-2 py-0.5 font-serif text-sm uppercase">
                  Prepared
                </span>
              </Stamp>
            )}
            {pushed && (
              <Stamp trigger="mount" active>
                <span className="border-2 border-ink px-2 py-0.5 font-serif text-sm uppercase">
                  Queued
                </span>
              </Stamp>
            )}
          </div>
        </Reveal>
      ) : (
        <Reveal className="mt-6">
          {/* Team view — the workforce roster */}
          <p className="mb-3 text-sm text-ink/70">Performance reviews your agents never had.</p>
          <div className="overflow-x-auto border border-hairline">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="rule border-b text-left">
                  <th className="sticky left-0 z-10 bg-paper py-3 pl-4 pr-3 font-medium">
                    Worker
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Outcomes verified</th>
                  <th className="px-3 py-3 text-right font-medium">Quality pass</th>
                  <th className="px-3 py-3 text-right font-medium">$ / outcome</th>
                  <th className="px-3 py-3 font-medium">Vs. baseline</th>
                  <th className="px-3 py-3 font-medium">Evidence</th>
                  <th className="py-3 pl-3 pr-4 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => (
                  <tr key={w.id} className="rule border-b last:border-b-0">
                    <td className="sticky left-0 z-10 bg-paper py-3 pl-4 pr-3">
                      <span className="font-medium">{w.name}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <OriginBadge origin={w.origin} />
                      </span>
                      <span className="mt-1 block max-w-[190px] whitespace-normal font-mono text-[10px] text-ink/60">
                        {w.actor}
                      </span>
                      {w.id === "meetings" && (
                        <span className="mt-2 block max-w-[190px]">
                          <span
                            className="flex h-2 w-full overflow-hidden"
                            role="img"
                            aria-label={`Attribution split: agent ${meetingsAttributionSplit.agent * 100}%, human ${meetingsAttributionSplit.human * 100}%`}
                          >
                            <span
                              className="bg-ink/70"
                              style={{ width: `${meetingsAttributionSplit.agent * 100}%` }}
                            />
                            <span
                              className="bg-ink/25"
                              style={{ width: `${meetingsAttributionSplit.human * 100}%` }}
                            />
                          </span>
                          <span className="mt-1 block font-mono text-[10px] text-ink/60">
                            agent {Math.round(meetingsAttributionSplit.agent * 100)}% · human{" "}
                            {Math.round(meetingsAttributionSplit.human * 100)}%
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-ledger">{fmt.int(w.verified)}</td>
                    <td className="px-3 py-3 text-right">{w.qualityPassPct}%</td>
                    <td className="px-3 py-3 text-right">{fmt.usd(w.costPerVerified, 2)}</td>
                    <td className="max-w-[200px] px-3 py-3 text-xs text-ink/70">{w.vsBaseline}</td>
                    <td className="px-3 py-3">
                      <GradeChip grade={w.grade} />
                    </td>
                    <td className="py-3 pl-3 pr-4">
                      <Sparkline points={w.sparkline} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  );
}
