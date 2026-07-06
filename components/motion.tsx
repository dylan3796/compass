"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Section reveal: 12px rise + fade, 400ms, fires once. Reduced motion: static.
 * The reveal is an enhancement, never a gate: a fallback timer guarantees the
 * content paints even if the intersection never fires (fast scrolls, anchor
 * jumps, print, static capture).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ?? false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setShown(true);
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    const fallback = window.setTimeout(() => setShown(true), 2000);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [shown]);

  const Tag = motion[as];
  if (reduced) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }
  return (
    <Tag
      // The union of motion element types defeats TS's ref inference; the
      // runtime target is always an HTMLElement.
      ref={ref as never}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={shown ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </Tag>
  );
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Count-up: tabular numerals, ease-out, 800ms, fires once on scroll-into-view.
 * Reduced motion: number pre-resolved.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  duration = 800,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(reduced ? value : 0);
  const fired = useRef(false);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || fired.current) return;
        fired.current = true;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          setDisplay(value * easeOutCubic(t));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, reduced]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * Verdict stamp press-in: scale 1.15→1.0, −2° resting rotation, single-frame
 * ink-bleed shadow on landing. Reduced motion: static end-state.
 */
export function Stamp({
  children,
  className,
  delay = 0,
  trigger = "view",
  active = true,
  rotate = -2,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** "view" animates on scroll-into-view; "mount" animates immediately when `active`. */
  trigger?: "view" | "mount";
  active?: boolean;
  /** Resting rotation in degrees — a real stamp never lands at the same angle twice. */
  rotate?: number;
}) {
  const reduced = useReducedMotion();
  // Never gate content on the observer: if whileInView hasn't fired shortly
  // after mount (fast scrolls, static capture), force the resting state.
  const [forced, setForced] = useState(false);
  useEffect(() => {
    if (trigger !== "view") return;
    const t = window.setTimeout(() => setForced(true), 1800);
    return () => window.clearTimeout(t);
  }, [trigger]);
  const resting = { opacity: 1, scale: 1, rotate };
  if (reduced) {
    return (
      <span
        className={`inline-block ${className ?? ""}`}
        style={{ transform: `rotate(${rotate}deg)` }}
      >
        {children}
      </span>
    );
  }
  const animation = {
    initial: { opacity: 0, scale: 1.15, rotate },
    transition: { duration: 0.25, delay, ease: [0.2, 0.9, 0.3, 1] as const },
  };
  return (
    <motion.span
      className={`inline-block will-change-transform ${className ?? ""}`}
      {...animation}
      {...(trigger === "view"
        ? {
            whileInView: resting,
            ...(forced ? { animate: resting } : {}),
            viewport: { once: true, margin: "-20px" },
          }
        : { animate: active ? resting : animation.initial })}
      onAnimationComplete={() => {}}
      style={{ transformOrigin: "center" }}
    >
      <motion.span
        className="block"
        initial={{ boxShadow: "0 0 0 rgba(16,16,16,0)" }}
        {...(trigger === "view"
          ? { whileInView: { boxShadow: ["0 0 0 rgba(16,16,16,0)", "0 2px 10px rgba(16,16,16,0.35)", "0 1px 2px rgba(16,16,16,0.12)"] }, viewport: { once: true } }
          : active
            ? { animate: { boxShadow: ["0 0 0 rgba(16,16,16,0)", "0 2px 10px rgba(16,16,16,0.35)", "0 1px 2px rgba(16,16,16,0.12)"] } }
            : {})}
        transition={{ duration: 0.35, delay: delay + 0.18, times: [0, 0.4, 1] }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}
