"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Reveal, Stamp } from "@/components/motion";
import {
  benchmarkTeaser,
  company,
  fmt,
  gradeDescriptions,
  headers,
  workflows,
} from "@/lib/data";
import type { Grade } from "@/lib/data";
import { OriginBadge, VerdictStamp } from "@/components/chips";
import LeadCapture from "./LeadCapture";
import SiteFooter from "./SiteFooter";
import SiteNav from "./SiteNav";
import SpendCalculator from "./SpendCalculator";
import Tiers from "./Tiers";

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
      <SiteNav onGetStatement={() => setLeadOpen(true)} />

      <main>
        {/* §1 Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-16">
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
            Every result your agents bill for, priced against what it actually earned you.
            Then the move, drafted: double down, reroute, or cut. Proof from your own files in
            minutes.
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

          <SettlementFunnel />

          <p className="mt-6 font-serif text-2xl text-verdict sm:text-3xl">
            Verdicts: {fmt.usd(headers.projectedVerdictImpact)}/mo —{" "}
            {Math.round((headers.projectedVerdictImpact / headers.spend) * 100)}% of agent
            spend.
          </p>
          <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-ink/60">
            Meridian, June 2026 — the specimen statement behind every number on this page.{" "}
            <Link href="/demo" className="whitespace-nowrap underline underline-offset-4">
              See it in full →
            </Link>{" "}
            ·{" "}
            <Link href="/workbench" className="whitespace-nowrap underline underline-offset-4">
              Run your own files →
            </Link>
          </p>
        </section>

        {/* §2 The problem, told at ground level */}
        <section className="mx-auto max-w-6xl px-4 py-20">
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
                  "The vendor billed 3,214 resolutions. Reopens don't show on its dashboard, and she has no count of her own. She pays.",
                ],
                [
                  "IT lead",
                  "His onboarding agent works — he's almost sure. No number for what it saves, so his ask for two more dies in review.",
                ],
                [
                  "Sales director",
                  "The SDR agent bills for meetings her reps say were already coming. Nobody can prove it either way. The fight repeats monthly.",
                ],
                [
                  "CFO",
                  "Agent spend: one line, up and to the right. She can price a rep, a contractor, a seat. Not this.",
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
            Four people, one missing thing: an independent record of what the agents actually
            delivered.
          </p>
        </section>

        {/* §3 The claim */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          {[
            "Doubt freezes agent budgets. Renewals stall, invoices get paid on faith, the third agent never gets funded.",
            "Causa turns doubt into a record — and the record into moves. Payer-funded, permanently.",
          ].map((line) => (
            <div key={line} className="rule border-t py-6">
              <p className="max-w-4xl font-serif text-2xl sm:text-3xl">{line}</p>
            </div>
          ))}
          <div className="rule border-t" />
          <p className="py-4 text-[15px] text-ink/70">
            <Link href="/company" className="underline underline-offset-4 hover:text-ink">
              Why this layer has to exist →
            </Link>
          </p>
        </section>

        {/* §4 The four pillars — what the record gives you */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
            One record. Four jobs.
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
                  Built in-house, bought from a vendor, or hybrid — every claimed outcome lands
                  in one record, held to one bar, every run attributed to its model.
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
                  Outcomes on one side, cost on the other — by agent, by vendor, by model.
                  Export-ready, in the same language as every other line item.
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
                <h3 className="mt-1 font-serif text-3xl">Every statement ends in a move.</h3>
              </div>
              <div>
                <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                  Retune the instructions, reroute to a cheaper model, clone what works, cut
                  what isn&rsquo;t beating its baseline — per agent, artifact drafted.
                </p>
                <div className="mt-4 space-y-3">
                  {(
                    [
                      ["support", "Fair price is $1.06, not $1.50. Your case, drafted.", `${fmt.usd(1233)}/mo back`],
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
                  learns: outcomes you weren&rsquo;t measuring, where to point agents next,
                  your fleet read against the market.
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
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">Run it on your spend.</h2>
          <div className="mt-8 max-w-2xl">
            <SpendCalculator onGetStatement={() => setLeadOpen(true)} />
          </div>
        </section>

        {/* §6 How it works */}
        <section className="mx-auto max-w-6xl px-4 py-20">
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
                "Agent, model, or person — each claim matched to what did the work. The join is the hard part, and it's ours: keys hide in tool calls, hybrid work splits credit. What's joinable is reported before you pay.",
              ],
              [
                "Every month: a statement that ends in decisions.",
                "What was real, what each outcome cost, and the next step drafted.",
              ],
            ].map(([head, body], i) => (
              <Reveal key={head} delay={i * 0.05} className="rule flex gap-5 border-t py-5">
                <span className="eyebrow pt-2 text-ink/50">0{i + 1}</span>
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
        <section className="mx-auto max-w-6xl px-4 py-20">
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

        {/* §8 Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
            Minutes to proof. Days to your first statement.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] text-ink/70">
            Run your own exports in the workbench right now — no signup. Pilot from $7.5K,
            credited against your first year. Two exports and a join key.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
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
