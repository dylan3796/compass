"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { fmt, headers } from "@/lib/data";

/* ------------------------------------------------------------------ */
/* Desktop: a horizontal stream of tick-marks flows right through two */
/* gates, tied to scroll position via transform interpolation.        */
/* ------------------------------------------------------------------ */

const COLS = 40;
const ROWS = 4;
const TICKS = COLS * ROWS; // 160 ticks ≈ 30 claims each
const GATE1_X = 430; // VERIFIED
const GATE2_X = 680; // ATTRIBUTABLE
// 4,812 → 4,203: ~13% fall at gate one. 4,203 → 3,163: ~25% of the rest at gate two.
const FALL_AT_GATE1 = 20;
const FALL_AT_GATE2 = 35;

type TickSpec = { x: number; y: number; fallsAt: number | null };

const TICK_SPECS: TickSpec[] = Array.from({ length: TICKS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  // Spread the falling ticks across rows/columns deterministically.
  const fallRank = (i * 7) % TICKS;
  let fallsAt: number | null = null;
  if (fallRank < FALL_AT_GATE1) fallsAt = GATE1_X;
  else if (fallRank < FALL_AT_GATE1 + FALL_AT_GATE2) fallsAt = GATE2_X;
  return { x: col * 8, y: 8 + row * 16, fallsAt };
});

function Tick({ spec, streamX }: { spec: TickSpec; streamX: MotionValue<number> }) {
  const y = useTransform(streamX, (v) => {
    if (spec.fallsAt === null) return 0;
    const abs = v + spec.x;
    return abs > spec.fallsAt ? Math.min((abs - spec.fallsAt) * 0.9, 46) : 0;
  });
  const opacity = useTransform(streamX, (v) => {
    if (spec.fallsAt === null) return 1;
    const abs = v + spec.x;
    return abs > spec.fallsAt ? Math.max(1 - (abs - spec.fallsAt) / 90, 0) : 1;
  });
  const fill = useTransform(streamX, (v) =>
    spec.fallsAt !== null && v + spec.x > spec.fallsAt ? "#9A968E" : "#101010"
  );
  return (
    <motion.rect
      x={spec.x}
      y={spec.y}
      width={2.6}
      height={12}
      style={{ y, opacity, fill }}
    />
  );
}

function DesktopFunnel() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "start 0.25"],
  });
  // Block spans 320 viewBox units; it ends short of the terminal stamp.
  const streamX = useTransform(scrollYProgress, [0, 1], [10, 620]);
  const stampOpacity = useTransform(scrollYProgress, [0.86, 0.96], [0, 1]);
  const stampScale = useTransform(scrollYProgress, [0.86, 0.96], [1.15, 1]);

  return (
    <div ref={ref} className="relative mt-14 hidden h-[250px] md:block" aria-hidden="true">
      {/* Origin: the claim, at ledger scale */}
      <div className="absolute left-0 top-0">
        <p className="font-serif text-4xl">{fmt.int(headers.claimed)}</p>
        <p className="eyebrow mt-1 text-ink/60">claimed</p>
      </div>

      {/* Gate one — VERIFIED */}
      <div
        className="absolute top-0 -translate-x-1/2 text-center"
        style={{ left: `${GATE1_X / 10}%` }}
      >
        <p className="font-serif text-4xl">{fmt.int(headers.verified)}</p>
        <p className="eyebrow mt-1 text-ink/60">verified</p>
      </div>

      {/* Gate two — ATTRIBUTABLE label */}
      <div
        className="absolute top-0 -translate-x-1/2 text-center"
        style={{ left: `${GATE2_X / 10}%` }}
      >
        <p className="eyebrow mt-[46px] text-ink/60">attributable</p>
      </div>

      {/* Gate lines through the stream */}
      {[GATE1_X, GATE2_X].map((x) => (
        <div
          key={x}
          className="absolute top-[76px] h-[110px] w-px bg-hairline"
          style={{ left: `${x / 10}%` }}
        />
      ))}

      <svg
        viewBox="0 0 1000 80"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-[92px] h-[80px] w-full overflow-visible"
      >
        <motion.g style={{ x: streamX }}>
          {TICK_SPECS.map((spec, i) => (
            <Tick key={i} spec={spec} streamX={streamX} />
          ))}
        </motion.g>
      </svg>

      {/* What fell away, said plainly */}
      <p
        className="absolute top-[196px] -translate-x-1/2 whitespace-nowrap font-mono text-[11px] text-ink/60"
        style={{ left: `${GATE1_X / 10}%` }}
      >
        −{fmt.int(headers.claimed - headers.verified)} failed the quality bar
      </p>
      <p
        className="absolute top-[196px] -translate-x-1/2 whitespace-nowrap font-mono text-[11px] text-ink/60"
        style={{ left: `${GATE2_X / 10}%` }}
      >
        −{fmt.int(headers.verified - headers.attributable)} would have happened anyway
      </p>

      {/* Green-stamped terminal total */}
      <motion.div
        className="absolute right-0 top-[84px] border-2 border-ledger bg-paper px-4 py-2 text-ledger"
        style={{ opacity: stampOpacity, scale: stampScale, rotate: -2 }}
      >
        <span className="font-serif text-3xl">{fmt.int(headers.attributable)}</span>
        <span className="eyebrow block">settled</span>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile: vertical three-stage diagram; plays one 2.5s timeline on   */
/* tap or viewport entry, then rests. Static under reduced motion.    */
/* ------------------------------------------------------------------ */

const STAGES = [
  { label: "Claimed", value: headers.claimed, color: "bg-ink", delay: 0, drop: null },
  {
    label: "Verified",
    value: headers.verified,
    color: "bg-ink",
    delay: 0.85,
    drop: "failed the quality bar",
  },
  {
    label: "Attributable",
    value: headers.attributable,
    color: "bg-ledger",
    delay: 1.7,
    drop: "would have happened anyway",
  },
];

function StaticStages({ mode }: { mode: "empty" | "animate" | "final" }) {
  const max = headers.claimed;
  return (
    <div className="space-y-5">
      {STAGES.map((s, i) => (
        <div key={s.label}>
          <div className="flex items-baseline justify-between">
            <span className="eyebrow text-ink/60">{s.label}</span>
            <span
              className={`font-serif text-2xl ${i === STAGES.length - 1 ? "text-ledger" : ""}`}
            >
              {fmt.int(s.value)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full bg-ink/10">
            <motion.div
              className={`h-full ${s.color}`}
              initial={false}
              animate={{ scaleX: mode === "empty" ? 0 : s.value / max }}
              transition={
                mode === "animate"
                  ? { duration: 0.6, delay: s.delay, ease: "easeOut" }
                  : { duration: 0 }
              }
              style={{ transformOrigin: "left", width: "100%" }}
            />
          </div>
          {i > 0 && (
            <p className="mt-1 text-right font-mono text-[10px] text-ink/60">
              −{fmt.int(STAGES[i - 1].value - s.value)} {s.drop}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function MobileFunnel() {
  const reduced = useReducedMotion();
  const [played, setPlayed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || played) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPlayed(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, played]);

  return (
    <div
      ref={ref}
      className="mt-10 border border-hairline p-5 md:hidden"
      onClick={() => !reduced && setPlayed(true)}
    >
      {reduced ? (
        <StaticStages mode="final" />
      ) : (
        <StaticStages mode={played ? "animate" : "empty"} />
      )}
    </div>
  );
}

/** Reduced-motion desktop fallback: the static diagram with final numbers. */
function ReducedDesktop() {
  return (
    <div className="mt-14 hidden border border-hairline p-6 md:block">
      <StaticStages mode="final" />
    </div>
  );
}

export default function SettlementFunnel() {
  const reduced = useReducedMotion();
  return (
    <>
      {reduced ? <ReducedDesktop /> : <DesktopFunnel />}
      <MobileFunnel />
    </>
  );
}
