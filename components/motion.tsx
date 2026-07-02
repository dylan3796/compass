"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Section reveal: 12px rise + fade, 400ms, fires once. Reduced motion: static. */
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
  const Tag = motion[as];
  if (reduced) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
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
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** "view" animates on scroll-into-view; "mount" animates immediately when `active`. */
  trigger?: "view" | "mount";
  active?: boolean;
}) {
  const reduced = useReducedMotion();
  const resting = { opacity: 1, scale: 1, rotate: -2 };
  if (reduced) {
    return (
      <span className={`inline-block ${className ?? ""}`} style={{ transform: "rotate(-2deg)" }}>
        {children}
      </span>
    );
  }
  const animation = {
    initial: { opacity: 0, scale: 1.15, rotate: -2 },
    transition: { duration: 0.25, delay, ease: [0.2, 0.9, 0.3, 1] as const },
  };
  return (
    <motion.span
      className={`inline-block will-change-transform ${className ?? ""}`}
      {...animation}
      {...(trigger === "view"
        ? { whileInView: resting, viewport: { once: true, margin: "-20px" } }
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
