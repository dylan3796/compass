"use client";

import { useState } from "react";
import { fmt, headers } from "@/lib/data";

const RATE = headers.projectedVerdictImpact / headers.spend;

/**
 * "Run it on your spend" — prices the reader's own stake at the specimen's
 * verdict rate. Honestly labeled: one fictional company's rate, not a promise.
 */
export default function SpendCalculator({ onGetStatement }: { onGetStatement: () => void }) {
  const [spend, setSpend] = useState(25000);
  const verdicts = Math.round((spend * RATE) / 10) * 10;

  return (
    <div className="rule border-y py-8">
      <label className="block max-w-xl">
        <span className="eyebrow text-ink/60">Your monthly agent spend</span>
        <span className="mt-2 flex items-baseline justify-between gap-4">
          <input
            type="range"
            min={2000}
            max={250000}
            step={1000}
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none bg-ink/10 accent-ink"
            aria-label="Monthly agent spend"
          />
          <span className="w-28 shrink-0 text-right font-mono text-lg">{fmt.usd(spend)}</span>
        </span>
      </label>
      <p className="mt-6 text-4xl text-verdict sm:text-5xl">
        <span className="font-sans font-semibold tabular-nums tracking-tight">
          {fmt.usd(verdicts)}/mo
        </span>{" "}
        <span className="font-serif">in verdicts.</span>
      </p>
      <p className="mt-2 max-w-xl text-sm text-ink/70">
        Meridian&rsquo;s verdict rate — {Math.round(RATE * 100)}% of spend — applied to yours.
        Your statement computes the real number.
      </p>
      <button className="btn-ink mt-5" onClick={onGetStatement}>
        Get statement
      </button>
    </div>
  );
}
