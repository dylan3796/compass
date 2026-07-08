import Link from "next/link";
import { fmt, headers, workflows } from "@/lib/data";

/**
 * The hero proof artifact: a fragment of the actual Verified Outcome Statement,
 * rendered like paper. Every figure traces to lib/data.ts. This replaces the
 * abstract tick-mark funnel — the visitor sees the deliverable (a month that
 * ends in four drafted decisions), not the method's shape.
 *
 * Color discipline: red is spent once, on the large total. Verdict chips and
 * per-row impacts stay ink (verdict red only clears WCAG AA above 24px); the
 * EXPAND row carries ledger green, which clears AA at any size.
 */
export default function StatementCard() {
  const pct = Math.round((headers.projectedVerdictImpact / headers.spend) * 100);

  return (
    <figure className="mt-12 max-w-2xl">
      <div className="border-2 border-ink bg-white/40 p-5 sm:p-7">
        <p className="eyebrow text-ink/55">
          Verified Outcome Statement · Meridian · June 2026 · Agent spend{" "}
          {fmt.usd(headers.spend)}
        </p>

        <div className="mt-4">
          {workflows.map((w) => {
            const isExpand = w.verdict === "EXPAND";
            return (
              <div
                key={w.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_5.25rem] items-baseline gap-x-3 border-t border-hairline py-3"
              >
                <div>
                  <p className="font-sans text-[15px] leading-tight">{w.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-ink/55">
                    {fmt.int(w.verified)} of {fmt.int(w.claimed)} verified
                  </p>
                </div>
                <span
                  className={`self-center whitespace-nowrap border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${
                    isExpand ? "border-ledger text-ledger" : "border-ink text-ink"
                  }`}
                >
                  {w.verdict}
                </span>
                <span
                  className={`text-right font-mono text-sm tabular-nums ${
                    isExpand ? "text-ledger" : "text-ink"
                  }`}
                >
                  {isExpand ? "+" : ""}
                  {fmt.usd(w.impactPerMonth)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-ink pt-3">
          <span className="font-sans text-sm text-ink/70">Decisions on the table</span>
          <span className="font-sans text-2xl font-semibold tracking-tight text-verdict sm:text-3xl">
            {fmt.usd(headers.projectedVerdictImpact)}/mo · {pct}% of spend
          </span>
        </div>
      </div>

      <figcaption className="mt-3 font-mono text-xs leading-relaxed text-ink/60">
        Meridian, June 2026 — a worked example. Every number on this page is from this
        statement.{" "}
        <Link href="/demo" className="whitespace-nowrap underline underline-offset-4">
          See it in full →
        </Link>
      </figcaption>
    </figure>
  );
}
