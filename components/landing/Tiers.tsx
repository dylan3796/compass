"use client";

import { useState } from "react";

const TIERS = [
  {
    name: "Tier 0 — Pilot",
    summary: "No integration required.",
    detail:
      "Export your agent activity. Export your outcomes. Give us the key that joins them. Statement in 7 days.",
  },
  {
    name: "Tier 1 — One workflow, live",
    summary: "One source, one system of record.",
    detail:
      "One read-only activity source (LangSmith, Langfuse, OpenTelemetry, or logs) + one system of record where outcomes land: Zendesk (ticket resolved), Salesforce (opportunity created), Jira (issue closed), ServiceNow (incident resolved), Stripe (payment settled).",
  },
  {
    name: "Tier 2 — The full ledger",
    summary: "Every workflow, one statement.",
    detail:
      "Connect the systems where outcomes land. Every workflow, every actor, one statement. No SDK. No proxy. Nothing to rip out.",
  },
];

export default function Tiers() {
  const [active, setActive] = useState(0);

  return (
    <div>
      <p className="eyebrow mb-3 text-ink/60">
        &ldquo;Two exports and a join key.&rdquo; — start with no integration, go live one
        workflow at a time
      </p>
      {/* Desktop: stepped diagram, click to expand */}
      <div className="hidden gap-4 md:grid md:grid-cols-3">
        {TIERS.map((t, i) => {
          const open = active === i;
          return (
            <button
              key={t.name}
              onClick={() => setActive(i)}
              aria-expanded={open}
              className={`flex flex-col border p-5 text-left transition-colors ${
                open ? "border-ink bg-white/50" : "border-hairline hover:border-ink/60"
              }`}
              style={{ marginTop: `${i * 28}px` }}
            >
              <span className={`font-serif text-5xl ${open ? "" : "text-ink/60"}`}>{i}</span>
              <span className="rule mt-2 border-t pt-2 font-serif text-xl">
                {t.name.replace(/^Tier \d — /, "")}
              </span>
              <span className="mt-1 text-sm text-ink/60">{t.summary}</span>
              <span className={`mt-3 text-sm leading-relaxed ${open ? "" : "hidden"}`}>
                {t.detail}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: accordion, Tier 0 expanded by default */}
      <div className="space-y-2 md:hidden">
        {TIERS.map((t, i) => {
          const open = active === i;
          return (
            <div key={t.name} className="border border-hairline">
              <button
                onClick={() => setActive(open ? -1 : i)}
                aria-expanded={open}
                className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-serif text-lg">{t.name}</span>
                <span aria-hidden="true" className="text-ink/50">
                  {open ? "−" : "+"}
                </span>
              </button>
              {open && (
                <p className="rule border-t px-4 py-3 text-sm leading-relaxed">{t.detail}</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink/70">
        We&rsquo;ll tell you what&rsquo;s verifiable with what you&rsquo;ve connected before
        you pay for anything.
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">
        And the record works both ways: it surfaces outcomes you weren&rsquo;t measuring, and
        recommends what to aim your agents at next.
      </p>
    </div>
  );
}
