"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Reveal, Stamp } from "@/components/motion";
import {
  company,
  fmt,
  gradeDescriptions,
  headers,
  impactSplit,
  market,
  workflows,
} from "@/lib/data";
import type { Grade } from "@/lib/data";
import { OriginBadge, VerdictStamp } from "@/components/chips";
import LeadCapture from "./LeadCapture";
import SpendCalculator from "./SpendCalculator";
import Tiers from "./Tiers";
import { benchmarkTeaser } from "@/lib/data";

// Hero animation code-split; static fallback keeps LCP light.
const SettlementFunnel = dynamic(() => import("./SettlementFunnel"), {
  ssr: false,
  loading: () => <div className="mt-14 h-[220px] max-md:h-[280px]" aria-hidden="true" />,
});

const GRADES: Grade[] = ["A", "B", "C", "D"];

export default function LandingPage() {
  const [leadOpen, setLeadOpen] = useState(false);

  return (
    <div className="bg-paper">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <p className="wordmark text-3xl">Causa.</p>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/demo"
            className="flex min-h-[44px] items-center text-[15px] underline-offset-4 hover:underline"
          >
            See the demo
          </Link>
          <button className="btn-ink" onClick={() => setLeadOpen(true)}>
            Get statement
          </button>
        </nav>
      </header>

      <main>
        {/* §1 Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-16">
          <p className="eyebrow text-ink/60">
            AI vendors grade their own homework. Causa checks the work.
          </p>
          <h1
            className="mt-4 max-w-5xl font-serif leading-[1.02]"
            style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}
          >
            Know what your agents actually delivered.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/80">
            Agents answer your tickets, book your meetings, turn your meeting notes into Jira
            tickets — and every result is self-reported. Causa checks each claimed outcome where
            it lands, prices what was real, and tells you what to do next. First statement in 7
            days.
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
            <Link
              href="/workbench"
              className="flex min-h-[44px] items-center text-[15px] underline-offset-4 hover:underline"
            >
              Run your own files →
            </Link>
          </div>

          <SettlementFunnel />

          <p className="mt-6 font-serif text-2xl text-verdict sm:text-3xl">
            Verdicts: {fmt.usd(headers.projectedVerdictImpact)}/mo —{" "}
            {Math.round((headers.projectedVerdictImpact / headers.spend) * 100)}% of agent
            spend.
          </p>
          <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-ink/60">
            {fmt.usd(impactSplit.recovered)} recovered by repricing, rerouting, and retiring ·{" "}
            {fmt.usd(impactSplit.expandable)} more if the account agent is cloned. Meridian is a
            fictional {company.headcount}-person specimen — and the build fails if this math
            stops reconciling.{" "}
            <Link href="/demo" className="underline underline-offset-4">
              See the statement →
            </Link>
          </p>

        </section>

        {/* §2 The problem, told at ground level */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <p className="eyebrow text-ink/60">
            Meridian — {company.headcount} people, a year into agents
          </p>
          <h2 className="mt-2 max-w-3xl font-serif text-4xl sm:text-5xl">
            Everyone suspects. Nobody knows.
          </h2>
          <div className="mt-8 max-w-3xl">
            {(
              [
                [
                  "Support manager",
                  "The vendor's dashboard says 3,214 tickets resolved. Her gut says a chunk came back within the week. There's no came-back-angry column — so she pays the invoice.",
                ],
                [
                  "IT lead",
                  "His team's agent sets up every new hire's accounts. Nobody can say what it saves, so at budget time it's a line item with a shrug — and his ask for two more agents dies in review.",
                ],
                [
                  "Sales director",
                  "The meeting-booker books meetings. Her reps swear the pipeline was already theirs. Nobody can prove it either way, so the argument repeats every month.",
                ],
                [
                  "CFO",
                  "One line item, up and to the right. She can price a salesperson, a contractor, a seat. The agent workforce — nobody can.",
                ],
              ] as const
            ).map(([role, line]) => (
              <div key={role} className="rule grid gap-1 border-t py-5 md:grid-cols-[11rem_1fr] md:gap-6">
                <p className="eyebrow pt-1 text-ink/60">{role}</p>
                <p className="text-[15px] leading-relaxed text-ink/80">{line}</p>
              </div>
            ))}
            <div className="rule border-t" />
          </div>
          <p className="mt-8 max-w-3xl font-serif text-2xl leading-snug sm:text-3xl">
            Four people, four versions of the same missing thing: an independent record of what
            the agents actually delivered.
          </p>
        </section>

        {/* §3 The claim */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          {[
            "Every outcome invoice is self-reported. And the agent's maker can't be the agent's referee.",
            "Causa is that record — the system of record for what your AI workforce actually delivers. Payer-funded, permanently.",
          ].map((line) => (
            <div key={line} className="rule border-t py-6">
              <p className="max-w-4xl font-serif text-2xl sm:text-3xl">{line}</p>
            </div>
          ))}
          <div className="rule border-t" />
          <p className="max-w-3xl py-4 font-mono text-xs leading-relaxed text-ink/60">
            The market&rsquo;s biggest support agent bills{" "}
            {fmt.usd(market.finPerResolution, 2)} a resolution — and just sold for $
            {market.finAcquisitionBn}B. Meanwhile the median company still spends{" "}
            {fmt.usd(market.medianMonthlyAiSpend)}/mo on AI while the top 1% runs hundreds of
            times that. The second wave hasn&rsquo;t arrived. The record should exist before it
            does.
          </p>
        </section>

        {/* §4 The four pillars — what the record gives you */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
            One record. Four things it does.
          </h2>
          <div className="mt-10">
            {/* Pillar 1 — one place */}
            <Reveal className="rule grid gap-4 border-t py-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-10">
              <div>
                <p className="eyebrow text-ink/60">01 · One place</p>
                <h3 className="mt-1 font-serif text-3xl">Every agent, one ledger.</h3>
              </div>
              <div>
                <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                  Built in-house, bought from a vendor, or hybrid — every agent&rsquo;s claimed
                  outcomes land in the same record, held to the same bar, with every activity
                  captured and every run attributed to its model.
                </p>
                <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink/70">
                  <OriginBadge origin="BUILT" />
                  <OriginBadge origin="BOUGHT" />
                  <OriginBadge origin="HYBRID" />
                  <span>
                    Meridian&rsquo;s four workflows · {fmt.usd(headers.spend)}/mo · one
                    statement
                  </span>
                </p>
              </div>
            </Reveal>

            {/* Pillar 2 — the read */}
            <Reveal className="rule grid gap-4 border-t py-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-10">
              <div>
                <p className="eyebrow text-ink/60">02 · The read</p>
                <h3 className="mt-1 font-serif text-3xl">An Agent P&amp;L, finally.</h3>
              </div>
              <div>
                <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                  Outcomes on one side, what the agents cost on the other — by agent, by vendor,
                  by model. Invoice-grade, export-ready, and finally in the same language as
                  every other line item.
                </p>
                <dl className="mt-4 max-w-md">
                  {(
                    [
                      ["Spend", fmt.usd(headers.spend)],
                      ["Verified outcomes", fmt.int(headers.verified)],
                      ["Verdict impact identified", `${fmt.usd(headers.projectedVerdictImpact)}/mo`],
                    ] as const
                  ).map(([label, figure]) => (
                    <div
                      key={label}
                      className="rule flex items-baseline justify-between gap-4 border-t py-2"
                    >
                      <dt className="text-sm text-ink/80">{label}</dt>
                      <dd className="font-mono text-sm">{figure}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>

            {/* Pillar 3 — the refinery */}
            <Reveal className="rule grid gap-4 border-t py-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-10">
              <div>
                <p className="eyebrow text-ink/60">03 · The refinery</p>
                <h3 className="mt-1 font-serif text-3xl">Refined, agent by agent.</h3>
              </div>
              <div>
                <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                  Every statement ends in the next best action per agent: retune its
                  instructions, reroute it to a cheaper model, clone what works into the next
                  workflow, cut what isn&rsquo;t beating its baseline — with the artifact
                  drafted.
                </p>
                <div className="mt-4 space-y-3">
                  {(
                    [
                      ["support", "Fair price is $1.06, not $1.50 — email drafted", `${fmt.usd(1233)}/mo back`],
                      ["meetings", "The reps were right — agent-only meetings convert worse", `${fmt.usd(2900)}/mo back`],
                      ["workspace", "Clone the account agent to contractor onboarding", `+${fmt.usd(2140)}/mo`],
                    ] as const
                  ).map(([id, line, figure]) => {
                    const w = workflows.find((x) => x.id === id)!;
                    return (
                      <div key={id} className="flex flex-wrap items-center gap-3">
                        <Stamp rotate={-1 - ((w.verdict.length * 3) % 5) * 0.5}>
                          <VerdictStamp verdict={w.verdict} label={w.verdict} size="sm" />
                        </Stamp>
                        <span className="text-sm text-ink/80">{line}</span>
                        <span className="ml-auto font-mono text-sm">{figure}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            {/* Pillar 4 — the intelligence */}
            <Reveal className="rule grid gap-4 border-y py-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-10">
              <div>
                <p className="eyebrow text-ink/60">04 · The intelligence</p>
                <h3 className="mt-1 font-serif text-3xl">A record you can ask.</h3>
              </div>
              <div>
                <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                  Every activity captured means every question answerable — and the record
                  learns. Causa surfaces outcomes you weren&rsquo;t measuring, recommends where
                  to point agents next, and reads your fleet against the market.
                </p>
                <p className="mt-4 font-mono text-xs leading-relaxed text-ink/70">
                  &ldquo;Why did support cost more in June?&rdquo; · &ldquo;Which runs touched
                  this ticket?&rdquo; · &ldquo;What should the notes agent stop doing?&rdquo;
                </p>
                <p className="rule mt-4 max-w-md border-t pt-3 text-sm text-ink/80">
                  Market signal: your cost per resolved ticket{" "}
                  <span className="font-mono">
                    {fmt.usd(benchmarkTeaser.yourCostPerResolvedTicket, 2)}
                  </span>{" "}
                  · Benchmark median{" "}
                  <span className="font-mono">{fmt.usd(benchmarkTeaser.benchmarkMedian, 2)}</span>{" "}
                  · {benchmarkTeaser.percentile}st percentile. Every statement sharpens it.
                </p>
              </div>
            </Reveal>
          </div>
          <p className="mt-6 font-serif text-xl italic text-ink/80">
            One record. It cascades — board deck to team standup.
          </p>
        </section>

        {/* §5 Run it on your spend */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">Run it on your spend.</h2>
          <div className="mt-8 max-w-2xl">
            <SpendCalculator onGetStatement={() => setLeadOpen(true)} />
          </div>
        </section>

        {/* §6 How it works */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <Reveal>
            <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">How it works</h2>
          </Reveal>
          <div className="mt-8 max-w-3xl">
            {[
              [
                "Connect where outcomes land.",
                "Zendesk, Jira, Salesforce, Stripe — or start with two CSV exports and a join key. Read-only.",
              ],
              [
                "Causa matches every outcome to whatever did the work.",
                "Agent, model, or person — each claimed result checked against the record. This is the hard part, and it's ours: join keys hide in tool calls, hybrid work splits credit, and Causa reports exactly what's joinable before you pay.",
              ],
              [
                "Every month: a statement that ends in decisions.",
                "What was real, what each outcome cost, and the next step drafted.",
              ],
            ].map(([head, body], i) => (
              <Reveal key={head} delay={i * 0.05} className="rule flex gap-5 border-t py-5">
                <span className="font-serif text-4xl text-ink/60">{i + 1}</span>
                <div>
                  <h3 className="font-serif text-2xl">{head}</h3>
                  <p className="mt-1 text-[15px] text-ink/70">{body}</p>
                </div>
              </Reveal>
            ))}
            <div className="rule border-t" />
          </div>

          {/* What lands where — the outcomes themselves, per system */}
          <div className="mt-10 grid max-w-3xl gap-x-10 sm:grid-cols-2">
            {[
              ["Zendesk", "Ticket resolved"],
              ["Stripe", "Payment settled · Refund processed"],
              ["Salesforce", "Opportunity created"],
              ["ServiceNow", "Workspace provisioned"],
              ["Google Drive", "Document approved"],
              ["Jira", "Meeting notes → ticket · Issue closed"],
            ].map(([source, event]) => (
              <div
                key={source}
                className="rule flex items-baseline justify-between gap-4 border-b py-2"
              >
                <span className="eyebrow text-ink/60">{source}</span>
                <span className="text-right text-sm">{event}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-3xl text-sm text-ink/70">
            Whatever the outcome, if it lands in a system of record, Causa verifies it — and
            ties it to whatever did the work.
          </p>

          <div className="mt-10">
            <Tiers />
          </div>
        </section>

        {/* §7 Proof discipline — compressed */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
            Not all proof is equal. We grade ours.
          </h2>
          <div className="mt-8 grid max-w-3xl gap-x-10 sm:grid-cols-2">
            {GRADES.map((g) => (
              <div key={g} className="rule flex items-baseline gap-3 border-t py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center self-center border-2 border-ink font-serif text-xl">
                  {g}
                </span>
                <p className="text-sm leading-relaxed text-ink/80">
                  <span className="font-medium">{gradeDescriptions[g].name}.</span>{" "}
                  {gradeDescriptions[g].line}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-[15px] text-ink/70">
            Every verdict carries its grade — and the path to a better one. Built or bought,
            every agent answers to the same bar:{" "}
            <Link href="/demo" className="underline underline-offset-4">
              see the fleet in the demo →
            </Link>
          </p>
        </section>

        {/* §7 The vision ladder */}
        <section className="rule border-y py-24">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <h2 className="font-serif text-5xl sm:text-7xl">Meter</h2>
              <p className="mt-2 max-w-xl text-[15px] text-ink/70">
                Verify. Every claimed outcome checked where it lands, then asked: would it have
                happened anyway?
              </p>
            </Reveal>
            <Reveal className="mt-16">
              <h2 className="font-serif text-5xl sm:text-7xl">Verdict</h2>
              <p className="mt-2 max-w-xl text-[15px] text-ink/70">
                Act. Every statement ends in a decision with the dollar impact attached — and
                three of the five need no vendor conversation.
              </p>
              <p className="mt-3 font-mono text-xs tracking-wide text-ink/60">
                REPRICE · REROUTE · RENEGOTIATE · RETIRE · EXPAND
              </p>
            </Reveal>
            <Reveal className="mt-16">
              <h2 className="font-serif text-5xl sm:text-7xl">Standard</h2>
              <p className="mt-2 max-w-xl text-[15px] text-ink/70">
                Every statement sharpens the Benchmark. &ldquo;Causa Verified&rdquo; is how
                vendors will prove value — and how buyers will set price.
              </p>
            </Reveal>
            <Reveal className="mt-16">
              <p className="max-w-3xl font-serif text-2xl leading-snug sm:text-3xl">
                Every economy that pays for results built a verification layer beside it —
                audits, ratings, ad verification, payment networks. Machine labor is next.
                Causa is that layer.
              </p>
            </Reveal>
          </div>
        </section>

        {/* §8 Sell-side strip */}
        <section className="bg-ink py-10 text-paper">
          <div className="mx-auto max-w-6xl px-4">
            <p className="max-w-3xl font-serif text-xl sm:text-2xl">
              Agent vendors: enterprise buyers are going to ask who verified your outcomes. Get
              Causa Verified before they do.
            </p>
          </div>
        </section>

        {/* §9 Founder block + final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-24">
          <p className="max-w-3xl text-[15px] leading-relaxed text-ink/80">
            Built by the operator who ran partner attribution at a $5B-ARR data company —
            crediting logic, incentive design, and outcome measurement for the messiest actors
            in B2B: humans. Agents are the easy part.
          </p>
          <div className="mt-14">
            <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
              First Verified Outcome Statement in 7 days.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] text-ink/70">
              Pilot from $7.5K, credited against your first year. Two exports and a join key.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
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
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="rule border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="wordmark text-2xl">Causa.</p>
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
            <a
              href="mailto:hello@causa.co"
              className="flex min-h-[44px] items-center underline-offset-4 hover:underline sm:min-h-0"
            >
              hello@causa.co
            </a>
            <Link
              href="/demo"
              className="flex min-h-[44px] items-center underline-offset-4 hover:underline sm:min-h-0"
            >
              See the demo
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4">
          <p className="mt-6 text-xs text-ink/60">
            Causa provides operational outcome verification. Not accounting, audit, or assurance
            services.
          </p>
        </div>
      </footer>

      {leadOpen && <LeadCapture onClose={() => setLeadOpen(false)} />}
    </div>
  );
}
