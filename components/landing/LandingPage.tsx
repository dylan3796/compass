"use client";

import Link from "next/link";
import { useState } from "react";
import { Stamp } from "@/components/motion";
import { fmt, workedExamples } from "@/lib/data";
import { VerdictStamp } from "@/components/chips";
import LeadCapture from "./LeadCapture";
import SiteFooter from "./SiteFooter";
import SiteNav from "./SiteNav";
import SpendCalculator from "./SpendCalculator";
import StatementCard from "./StatementCard";

export default function LandingPage() {
  const [leadOpen, setLeadOpen] = useState(false);

  return (
    <div className="bg-paper">
      <SiteNav onGetStatement={() => setLeadOpen(true)} />

      <main>
        {/* Hero — the outcome, then the artifact */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:pt-16">
          <p className="eyebrow text-ink/60">
            Causa doesn&rsquo;t report outcomes. It settles them.
          </p>
          <h1
            className="mt-4 max-w-5xl font-serif leading-[1.02]"
            style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}
          >
            Know what your agents actually delivered.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/80">
            Every result your agents bill for — verified in your own systems, priced in dollars,
            and closed with a decision. For whoever signs the AI invoices.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="btn-ink" onClick={() => setLeadOpen(true)}>
              Get statement
            </button>
            <Link
              href="/demo"
              className="flex min-h-[44px] items-center text-[15px] font-medium underline-offset-4 hover:underline"
            >
              See the demo →
            </Link>
          </div>

          <StatementCard />
        </section>

        {/* §1 — the villain, named in the payer's words + the vision */}
        <section className="mx-auto max-w-6xl px-4 py-28">
          <h2 className="max-w-4xl font-serif text-5xl leading-[1.05] sm:text-6xl">
            Every result on the invoice is self-reported.
          </h2>
          <p className="mt-8 max-w-[54ch] text-lg leading-relaxed text-ink/80">
            Agents close your tickets, onboard your hires, book your meetings — then bill you per
            result. Every count comes from the seller&rsquo;s own dashboard. Advertising settled
            this with independent measurement once it went outcome-priced. Machine labor is next.
          </p>
          <p className="mt-8 max-w-3xl font-serif text-3xl leading-snug sm:text-4xl">
            Causa is that record. Built for the payer, funded by the payer.
          </p>
          <p className="mt-6">
            <Link
              href="/company"
              className="text-[15px] underline underline-offset-4 hover:text-ink"
            >
              Why this layer has to exist →
            </Link>
          </p>
        </section>

        {/* §2 VERIFY — how it works, part one; entices /workbench */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <p className="eyebrow text-ink/50">01 · Verify</p>
          <h2 className="mt-2 max-w-3xl font-serif text-4xl sm:text-5xl">
            Your systems already know the truth.
          </h2>
          <p className="mt-8 max-w-[54ch] text-lg leading-relaxed text-ink/80">
            Causa reads your own records — Zendesk, Salesforce, ServiceNow — read-only, and tests
            every claim two ways: <em>did it hold up</em>, and{" "}
            <em>would it have happened anyway?</em> In Meridian&rsquo;s June, 4,812 results were
            claimed. 3,163 would not have happened without the agents. The gap is money.
          </p>
          <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-ink/80">
            Prove it on your own exports — in your browser, in minutes, no signup.
          </p>
          <p className="mt-4">
            <Link
              href="/workbench"
              className="text-[15px] font-medium underline underline-offset-4 hover:text-ink"
            >
              Run your own files →
            </Link>
          </p>
        </section>

        {/* §3 PRICE — how it works, part two; entices lead capture via calculator */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <p className="eyebrow text-ink/50">02 · Price</p>
          <h2 className="mt-2 max-w-3xl font-serif text-4xl sm:text-5xl">
            What each result actually earned you.
          </h2>
          <p className="mt-8 max-w-[54ch] text-lg leading-relaxed text-ink/80">
            Every verified result, priced against the invoice and against the old way. The
            support vendor bills {fmt.usd(workedExamples.support.billed, 2)} a resolution; the
            fair price is {fmt.usd(workedExamples.support.fair, 2)} — case drafted, ready to send.
          </p>

          <dl className="mt-8 max-w-lg">
            {(
              [
                ["Employee onboarding", workedExamples.workspace.oldCost, workedExamples.workspace.agentCost],
                ["Support resolution", workedExamples.support.billed, workedExamples.support.fair],
              ] as const
            ).map(([label, from, to]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-t border-hairline py-2.5"
              >
                <dt className="text-[15px] text-ink/80">{label}</dt>
                <dd className="font-sans text-lg font-semibold tabular-nums tracking-tight">
                  {fmt.usd(from, 2)} <span className="text-ink/40">→</span> {fmt.usd(to, 2)}
                </dd>
              </div>
            ))}
            <div className="border-t border-hairline" />
          </dl>

          <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-ink/80">
            An Agent P&amp;L, in the same language as every other line item.
          </p>

          <div className="mt-12">
            <h3 className="font-serif text-2xl">Run it on your spend.</h3>
            <div className="mt-5 max-w-2xl">
              <SpendCalculator onGetStatement={() => setLeadOpen(true)} />
            </div>
          </div>
        </section>

        {/* §4 DECIDE — the payoff; entices /demo */}
        <section className="mx-auto max-w-6xl px-4 py-28">
          <p className="eyebrow text-ink/50">03 · Decide</p>
          <h2 className="mt-2 max-w-3xl font-serif text-4xl sm:text-5xl">
            Every statement ends in a move.
          </h2>
          <div className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-[1fr_auto] md:items-start">
            <p className="max-w-[54ch] text-lg leading-relaxed text-ink/80">
              Not a chart — a move per agent, evidence attached. June&rsquo;s sharpest call: the
              SDR agent kept booking meetings the reps say they&rsquo;d have closed anyway. The
              staged rollout proved it — the agent-only slice converts 8%, against 11% without
              it. Retire it, recover{" "}
              <span className="font-mono text-verdict">{fmt.usd(2900)}/mo</span>. The wind-down
              comes drafted.
            </p>
            <Stamp className="justify-self-start md:mt-2" rotate={-3}>
              <VerdictStamp verdict="RETIRE" label="RETIRE" size="lg" />
            </Stamp>
          </div>
          <p className="mt-10 font-serif text-2xl italic text-ink/80">
            One record. It cascades — board deck to team standup.
          </p>
          <p className="mt-6">
            <Link
              href="/demo"
              className="text-[15px] font-medium underline underline-offset-4 hover:text-ink"
            >
              Walk Meridian&rsquo;s full statement →
            </Link>
          </p>
        </section>

        {/* §5 START — conversion */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
            Minutes to proof. Days to your first statement.
          </h2>
          <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-ink/80">
            Drop two exports into the workbench and watch it match work to results in your
            browser — no signup. Then the statement: pilots from $7.5K, credited against year
            one. Two exports and a join key.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="btn-ink" onClick={() => setLeadOpen(true)}>
              Get statement
            </button>
            <Link
              href="/workbench"
              className="flex min-h-[44px] items-center text-[15px] font-medium underline-offset-4 hover:underline"
            >
              Run your own files →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />

      {leadOpen && <LeadCapture onClose={() => setLeadOpen(false)} />}
    </div>
  );
}
