"use client";

import { useMemo, useState } from "react";
import {
  activityRuns,
  discoveredOutcomes,
  fmt,
  recordSystemForWorkflow,
  sources,
} from "@/lib/data";
import type { SourceTile } from "@/lib/data";
import { Reveal, Stamp } from "@/components/motion";

/** Which discoveries each system of record surfaces once connected. */
const DISCOVERY_SOURCE: Record<string, number[]> = {
  Stripe: [0],
  Zendesk: [1],
  Jira: [2],
};

export default function Screen2Connect() {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [jiraDetail, setJiraDetail] = useState(false);

  const toggle = (name: string) =>
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const activityCount = sources.filter(
    (s) => s.kind === "activity" && connected.has(s.name)
  ).length;
  const outcomeCount = sources.filter(
    (s) => s.kind === "outcome" && connected.has(s.name)
  ).length;

  // A workflow is verifiable when its system of record is connected AND at
  // least one activity source exists to join against — verification has a floor.
  const verifiable =
    activityCount === 0
      ? 0
      : Object.values(recordSystemForWorkflow).filter((sys) => connected.has(sys)).length;

  // Only the connected activity sources' runs count as ingested.
  const runsIngested = sources
    .filter((s) => s.kind === "activity" && connected.has(s.name))
    .reduce((acc, s) => acc + (activityRuns[s.name as keyof typeof activityRuns] ?? 0), 0);

  const meterLine = useMemo(() => {
    if (activityCount === 0 && outcomeCount === 0)
      return "Connect one activity source and one system of record to begin.";
    if (activityCount > 0 && outcomeCount === 0)
      return `${fmt.int(runsIngested)} runs ingested. Connect a system of record — outcomes live where work lands.`;
    if (activityCount === 0 && outcomeCount > 0)
      return `Outcome events found in ${outcomeCount} ${outcomeCount === 1 ? "system" : "systems"}. Connect an activity source to join work to result.`;
    if (verifiable < 4)
      return `${verifiable} of 4 workflows verifiable · Evidence ceiling: Grade C. Add rollout history for Grade B.`;
    return "4 of 4 workflows verifiable · Evidence ceiling: Grade B. Reserve a holdout for Grade A — support already runs one.";
  }, [activityCount, outcomeCount, verifiable, runsIngested]);

  const visibleDiscoveries = useMemo(
    () =>
      discoveredOutcomes
        .map((d, i) => ({ ...d, index: i }))
        .filter((d) =>
          Object.entries(DISCOVERY_SOURCE).some(
            ([source, idxs]) => connected.has(source) && idxs.includes(d.index)
          )
        ),
    [connected]
  );

  const tile = (t: SourceTile) => {
    const isOn = connected.has(t.name);
    return (
      <button
        key={t.name}
        onClick={() => toggle(t.name)}
        aria-pressed={isOn}
        className={`group flex min-h-[96px] flex-col border p-3 text-left transition-colors ${
          isOn ? "border-ink bg-white/60" : "border-hairline hover:border-ink/60"
        }`}
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{t.name}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60">
            {t.kind === "activity" ? "activity" : "record"}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-ink/60">{t.reads}</span>
        <span className="mt-auto block pt-2">
          {isOn ? (
            t.partial ? (
              <span className="text-xs font-medium text-ink">
                1,120 issues closed · 61% joinable ·{" "}
                <span
                  role="button"
                  tabIndex={0}
                  className="underline underline-offset-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setJiraDetail((v) => !v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setJiraDetail((v) => !v);
                    }
                  }}
                >
                  improve join key →
                </span>
                {jiraDetail && (
                  <span className="mt-1 block font-normal text-ink/70">
                    39% of runs are missing the Jira issue key. Map issue key to run entity ID
                    to reach 100%.
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs font-medium text-ink">{t.connected}</span>
            )
          ) : (
            <span className="text-xs text-ink/60 underline decoration-hairline underline-offset-4 group-hover:decoration-ink">
              Connect →
            </span>
          )}
        </span>
      </button>
    );
  };

  const meterId = "verifiable-meter";
  const meterValue = `${verifiable} of 4 workflows verifiable`;

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl">Connect sources</h1>
        <p className="mt-2 text-ink/70">
          Read-only. Outcomes from where they already land; activity from what already logs it.
        </p>
      </header>

      <section aria-labelledby="activity-h">
        <h2 id="activity-h" className="eyebrow text-ink/60">
          Activity — what ran
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sources.filter((s) => s.kind === "activity").map(tile)}
        </div>
      </section>

      <section aria-labelledby="outcome-h" className="mt-8">
        <h2 id="outcome-h" className="eyebrow text-ink/60">
          Systems of record — what landed
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sources.filter((s) => s.kind === "outcome").map(tile)}
        </div>
        <p className="mt-3 text-sm text-ink/60">
          Whatever the outcome — a ticket resolved, a payment settled, a meeting booked — Causa
          ties it to whatever did the work.
        </p>
      </section>

      {/* Discovered outcomes — the ones nobody thought to measure */}
      {outcomeCount > 0 && (
        <Reveal className="mt-10 border border-ink bg-white/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl">Outcomes you weren&rsquo;t measuring</h2>
              <p className="mt-1 text-sm text-ink/70">
                You define what counts. Causa reads what else landed.
              </p>
            </div>
            <Stamp trigger="mount" active>
              <span className="border-2 border-ink px-2 py-0.5 font-serif text-sm uppercase">
                Found
              </span>
            </Stamp>
          </div>
          <div className="mt-4">
            {visibleDiscoveries.length === 0 ? (
              <p className="rule border-t pt-3 text-sm text-ink/60">
                Connect Stripe, Zendesk, or Jira to see what Meridian wasn&rsquo;t measuring.
              </p>
            ) : (
              visibleDiscoveries.map((d) => (
                <div
                  key={d.index}
                  className="rule flex flex-col gap-2 border-t py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/60">
                      {d.source}
                    </p>
                    <p className="mt-0.5 text-sm">{d.finding}</p>
                    <p className="text-xs text-ink/60">{d.suggestion}.</p>
                  </div>
                  {added.has(d.index) ? (
                    <Stamp trigger="mount" active>
                      <span className="border-2 border-ink px-2 py-0.5 font-serif text-sm uppercase">
                        Added
                      </span>
                    </Stamp>
                  ) : (
                    <button
                      className="btn-outline shrink-0 text-sm"
                      onClick={() => setAdded((prev) => new Set(prev).add(d.index))}
                    >
                      {d.cta}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <p className="rule mt-4 border-t pt-3 text-sm text-ink/60">
            Every statement sharpens the next. Causa learns which outcomes move your numbers —
            and recommends where to point your agents next.
          </p>
        </Reveal>
      )}

      {/* What's verifiable now */}
      <Reveal className="mt-10 border border-hairline bg-white/40 p-5">
        <h2 id={meterId} className="font-serif text-xl">
          What&rsquo;s verifiable now
        </h2>
        <div
          role="meter"
          aria-labelledby={meterId}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={verifiable}
          aria-valuetext={meterValue}
          className="mt-4 h-2 w-full bg-ink/10"
        >
          <div
            className="h-full bg-ledger transition-[width] duration-500 ease-out"
            style={{ width: `${(verifiable / 4) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-sm">
          {activityCount + outcomeCount}{" "}
          {activityCount + outcomeCount === 1 ? "source" : "sources"} connected · {meterLine}
        </p>
        {activityCount > 0 && outcomeCount > 0 && (
          <p className="rule mt-4 border-t pt-3 font-mono text-xs leading-relaxed text-ink/70">
            JOIN — runs match outcomes on IDs you already have: ticket ID · employee email ·
            document ID · opportunity ID. Two exports and a join key.
          </p>
        )}
        <p className="rule mt-4 border-t pt-3 text-sm text-ink/60">
          No SDK. No proxy. Statement ready days after first sync. Have exports already?{" "}
          <a href="/workbench" className="underline underline-offset-4">
            Run them in the workbench →
          </a>
        </p>
      </Reveal>
    </div>
  );
}
