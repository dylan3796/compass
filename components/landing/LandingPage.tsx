"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal, Stamp } from "@/components/motion";
import { fmt, market, workedExamples } from "@/lib/data";
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
            Causa verifies every result your agents claim — in your own Zendesk, Salesforce, and
            ServiceNow records — prices what it earned you, and drafts the next move. For the
            leader who signs the AI invoices.
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
          <div className="mt-10 max-w-[60ch] space-y-5 text-[17px] leading-relaxed text-ink/80">
            <p>
              Agents now close tickets, set up new hires, and book meetings — and bill you per
              result. Intercom&rsquo;s Fin charges {fmt.usd(market.finPerResolution, 2)} a
              resolution; it sold for ${market.finAcquisitionBn}B. But every count on those
              invoices comes from the seller&rsquo;s own dashboard. The support manager has no
              reopen count of her own. The CFO can price a rep, a contractor, a seat — not this.
            </p>
            <p>
              Advertising crossed this bridge twenty years ago. When ads went outcome-priced,
              buyers stopped taking the seller&rsquo;s word for it, and independent measurement
              became a permanent layer of that economy. Machine labor is the next economy that
              pays for results. Its record doesn&rsquo;t exist yet.
            </p>
          </div>
          <p className="mt-8 max-w-3xl font-serif text-3xl leading-snug sm:text-4xl">
            Causa is that record. Built for the payer, funded by the payer, permanently.
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
          <div className="mt-8 max-w-[60ch] space-y-5 text-[17px] leading-relaxed text-ink/80">
            <p>
              A resolved ticket lands in Zendesk. A new hire&rsquo;s account goes live in
              ServiceNow. An opportunity opens in Salesforce. Causa reads those records —
              read-only, no SDK, nothing to rip out — and holds every claimed result to two
              tests: <em>did it hold up</em>, and{" "}
              <em>would it have happened anyway?</em>{" "}
              Built or bought, every agent answers to the same bar.
            </p>
            <p>
              In Meridian&rsquo;s June statement, 4,812 claimed results came in. 4,203 held up.
              3,163 would not have happened without the agents. The gap is money.
            </p>
            <p>
              Not all proof is equal. We grade ours — every verdict carries its evidence grade,
              A to D, and the path to a stronger one.
            </p>
          </div>

          <p className="mt-8 max-w-3xl font-mono text-xs leading-relaxed text-ink/60">
            ZENDESK · ticket resolved &nbsp;—&nbsp; SERVICENOW · account live &nbsp;—&nbsp;
            SALESFORCE · opportunity created &nbsp;—&nbsp; STRIPE · payment settled
            &nbsp;—&nbsp; JIRA · issue closed
          </p>

          <p className="mt-8 max-w-[60ch] text-[17px] leading-relaxed text-ink/80">
            Don&rsquo;t take the method on faith. The workbench runs it on your own exports, in
            your browser, in minutes. No signup; no row leaves the tab. Two exports and a join
            key.
          </p>
          <p className="mt-6">
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
          <div className="mt-8 max-w-[60ch] space-y-5 text-[17px] leading-relaxed text-ink/80">
            <p>
              Meridian&rsquo;s in-house agent sets up new-hire accounts for{" "}
              {fmt.usd(workedExamples.workspace.agentCost, 2)} each. The old process cost{" "}
              {fmt.usd(workedExamples.workspace.oldCost, 2)} and took{" "}
              {workedExamples.workspace.oldDays} days; the agent takes{" "}
              {workedExamples.workspace.agentMinutes} minutes. That&rsquo;s the evidence that
              funds the next agent — no vendor conversation required.
            </p>
            <p>
              The support vendor bills {fmt.usd(workedExamples.support.billed, 2)} a resolution.
              Checked against a slice of tickets the agent never touches, the fair price is{" "}
              {fmt.usd(workedExamples.support.fair, 2)}. That case comes drafted, ready to send.
            </p>
          </div>

          <dl className="mt-8 max-w-lg">
            {(
              [
                ["New-hire account", workedExamples.workspace.oldCost, workedExamples.workspace.agentCost],
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

          <p className="mt-8 max-w-[60ch] text-[17px] leading-relaxed text-ink/80">
            Spend on one side, verified value on the other — cost per real result, by agent and
            by model. An Agent P&amp;L, finally, in the same language as every other line item.
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
            <div className="max-w-[60ch] space-y-5 text-[17px] leading-relaxed text-ink/80">
              <p>
                Not a chart — a drafted decision per workflow: double down on what&rsquo;s
                earning, reroute work to the cheaper model that passes the same bar, cut what
                isn&rsquo;t beating its baseline, renegotiate what&rsquo;s overpriced. Evidence
                attached, dollars projected.
              </p>
              <p>
                June&rsquo;s sharpest call: the sales director&rsquo;s reps swore the
                meeting-booker was claiming pipeline they had already built. The staged rollout
                proved them right — meetings from the agent-only slice convert 8%, against 11%
                without it. Retire the agent slice, keep the assisted playbook, recover{" "}
                <span className="font-mono text-verdict">{fmt.usd(2900)}/mo</span>. The
                wind-down is drafted. She clicks send.
              </p>
            </div>
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
          <p className="mt-6 max-w-[60ch] text-[17px] leading-relaxed text-ink/80">
            Proof first: drop two exports into the workbench and watch it match work to results
            in your browser. Minutes, no signup. Then the statement: pilots from $7.5K, credited
            against your first year. Two exports and a join key — and we tell you what&rsquo;s
            verifiable with what you&rsquo;ve connected before you pay for anything.
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
