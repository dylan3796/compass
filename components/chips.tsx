import type { Grade, Origin, Verdict } from "@/lib/data";

export function OriginBadge({ origin }: { origin: Origin }) {
  return (
    <span className="inline-block whitespace-nowrap border border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">
      {origin}
    </span>
  );
}

export function GradeChip({ grade, label }: { grade: Grade; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap border border-ink px-2 py-0.5 font-mono text-[11px]"
      title={label}
    >
      <span className="font-serif text-sm leading-none">{grade}</span>
      {label && <span className="text-ink/70">{label}</span>}
    </span>
  );
}

/** EXPAND is the only green verdict; everything else stamps in verdict red-orange. */
export function verdictColor(verdict: Verdict): string {
  return verdict === "EXPAND" ? "text-ledger border-ledger" : "text-verdict border-verdict";
}

export function VerdictStamp({
  verdict,
  label,
  size = "md",
}: {
  verdict: Verdict;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  // Verdict red measures ~3.6:1 on paper — AA only as large text, so stamps
  // never render below 24px.
  const sizes = {
    sm: "px-2 py-0.5 text-2xl",
    md: "px-3 py-1 text-2xl",
    lg: "px-4 py-1.5 text-3xl",
  };
  return (
    <span
      className={`inline-block whitespace-nowrap border-2 font-serif uppercase tracking-wide ${verdictColor(verdict)} ${sizes[size]}`}
    >
      {label}
    </span>
  );
}

export function Sparkline({ points, className }: { points: number[]; className?: string }) {
  const w = 72;
  const h = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points
    .map((p, i) => `${(i / (points.length - 1)) * (w - 4) + 2},${h - 3 - ((p - min) / range) * (h - 6)}`)
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <polyline points={coords} fill="none" stroke="#101010" strokeWidth="1.25" opacity="0.7" />
    </svg>
  );
}
