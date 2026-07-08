"use client";

import { useEffect, useRef, useState } from "react";
import { benchmarkTeaser, fmt, workflows } from "@/lib/data";
import type { Workflow } from "@/lib/data";
import { GradeChip, VerdictStamp } from "@/components/chips";
import { Reveal, Stamp } from "@/components/motion";

const ACTIONS: Record<string, { button: string; title: string; body: React.ReactNode }> = {
  support: {
    button: "Draft email",
    title: "Renegotiation email — draft",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="font-mono text-xs text-ink/60">
          To: partnerships@vendor · Re: June statement, support resolution pricing
        </p>
        <p>
          Our June Verified Outcome Statement shows 2,802 of 3,214 claimed resolutions verified
          against Zendesk, of which 1,989 were incremental against the 10% holdout — a 71%
          incrementality rate.
        </p>
        <p>
          At $1.50 per resolution, the effective price per incremental resolution is $2.42. A
          fair per-resolution price at observed incrementality is $1.06.
        </p>
        <p>
          Separately, 61 resolutions reopened within 7 days; we are applying the $91.50
          adjustment under the quality bar in our agreement.
        </p>
        <p>
          We&rsquo;d like to align the July rate to verified incrementality — a difference of
          $0.44 × 2,802 ≈ $1,233/mo. Statement attached.
        </p>
      </div>
    ),
  },
  workspace: {
    button: "Clone agent",
    title: "Clone plan — draft",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          Employee onboarding verified at $0.42 per new hire vs. $11.90 under the old process,
          with cycle time down from 2.1 days to 4 minutes and a 100% quality bar — every account
          active within 48 hours.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Clone the onboarding agent for contractor onboarding — same contract, same quality bar.</li>
          <li>Point it at the existing ServiceNow queue; no new integration.</li>
          <li>Causa verifies the clone from its first sync.</li>
        </ol>
        <p>Projected additional value ≈ $2,140/mo at current volume. No vendor involved.</p>
        <p className="text-ink/60">Evidence grade C (12-month matched baseline).</p>
      </div>
    ),
  },
  docgen: {
    button: "View plan",
    title: "Reroute plan — notes agent",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          The model-switch experiment shows the same 94% acceptance on both slices. Marginal
          cost: $3.10 per ticket on claude-fable-5 vs. $1.21 on the qwen-3 pilot slice.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Route standard meetings to qwen-3; hold acceptance at 94%.</li>
          <li>
            Retune the instructions once: keep claude-fable-5 for exec and multi-team meetings.
          </li>
          <li>Re-verify after two weeks against the same quality bar.</li>
        </ol>
        <p>Projected saving: $1.89 × 570 attributable tickets ≈ $1,077/mo. No vendor involved.</p>
        <p className="text-ink/60">Evidence grade B (model switch).</p>
      </div>
    ),
  },
  meetings: {
    button: "Export CSV",
    title: "Adjustment CSV — preview",
    body: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          Meetings from the agent-only slice convert at 8% vs. an 11% baseline without it; only
          the assisted slice beats the counterfactual. Retiring the agent slice recovers the
          $2,900/mo vendor fee.
        </p>
        <pre className="overflow-x-auto border border-hairline bg-white/50 p-3 font-mono text-xs leading-relaxed">
{`workflow,period,claimed,verified,attributable,action,amount
sales_meetings,2026-06,472,314,118,retire_agent_slice,-2900.00
support_tickets,2026-06,3214,2802,1989,reopen_adjustment,-91.50`}
        </pre>
      </div>
    ),
  },
};

function SlideOver({
  workflow,
  onClose,
}: {
  workflow: Workflow;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const action = ACTIONS[workflow.id];

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-ink/20"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={action.title}
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto border-l border-hairline bg-paper p-6 shadow-[-8px_0_24px_rgba(16,16,16,0.08)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-ink/60">{workflow.name}</p>
            <h2 className="mt-1 font-serif text-2xl">{action.title}</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-lg hover:border-ink"
          >
            ×
          </button>
        </div>
        <div className="rule mt-5 border-t pt-5">{action.body}</div>
        <p className="mt-6 font-mono text-[11px] text-ink/60">
          Mocked artifact — sample data, Meridian (fictional).
        </p>
      </div>
    </div>
  );
}

export default function Screen4Verdicts() {
  const [open, setOpen] = useState<Workflow | null>(null);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl">Verdicts</h1>
        <p className="mt-2 text-ink/70">
          Every statement ends in a decision — evidence attached, impact priced, next step
          drafted.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {workflows.map((w, i) => (
          <Reveal
            key={w.id}
            delay={i * 0.05}
            className="flex flex-col border border-hairline bg-white/40 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-xl">{w.name}</h2>
              <GradeChip grade={w.grade} label={w.gradeLabel.replace(/^[A-D] /, "")} />
            </div>
            <div className="mt-4">
              <Stamp delay={0.1 + i * 0.05} rotate={-1 - ((w.verdictLabel.length * 3) % 5) * 0.5}>
                <VerdictStamp verdict={w.verdict} label={w.verdictLabel} />
              </Stamp>
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-ink/80">
              {w.evidence.map((line) => (
                <li key={line} className="rule border-t pt-2 first:border-t-0 first:pt-0">
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center justify-between gap-3 pt-5">
              <p
                className={`font-serif text-2xl ${w.verdict === "EXPAND" ? "text-ledger" : "text-verdict"}`}
              >
                {w.verdict === "EXPAND" ? "+" : ""}
                {fmt.usd(w.impactPerMonth)}/mo
              </p>
              <button className="btn-outline text-sm" onClick={() => setOpen(w)}>
                {ACTIONS[w.id].button}
              </button>
            </div>
          </Reveal>
        ))}
      </div>

      {/* The cadence — a statement is a subscription, not a report */}
      <div className="rule mt-8 border-y py-4">
        <p className="eyebrow text-ink/60">July — already in motion</p>
        <div className="mt-2 grid gap-2 text-sm text-ink/80 sm:grid-cols-3">
          <p>Statement drafts automatically on the 3rd.</p>
          <p>
            Two recommendations queued: retune the notes agent&rsquo;s meeting filter ·
            re-verify the reroute.
          </p>
          <p>The $91.50 adjustment files to accounting.</p>
        </div>
      </div>

      {/* Benchmark teaser — one card only */}
      <Reveal className="mt-8 border border-dashed border-ink/60 p-5">
        <p className="eyebrow text-ink/60">Causa Benchmark — locked</p>
        <p className="mt-2 font-serif text-xl sm:text-2xl">
          Your marginal cost per resolved ticket:{" "}
          {fmt.usd(benchmarkTeaser.yourCostPerResolvedTicket, 2)} · Causa Benchmark median:{" "}
          {fmt.usd(benchmarkTeaser.benchmarkMedian, 2)} · {benchmarkTeaser.percentile}st
          percentile.
        </p>
        <p className="mt-2 text-sm text-ink/60">
          Every statement sharpens the Benchmark. Yours would too.
        </p>
      </Reveal>

      {open && <SlideOver workflow={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
