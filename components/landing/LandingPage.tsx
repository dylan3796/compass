"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Reveal, Stamp } from "@/components/motion";
import { company, fmt, gradeDescriptions, headers, workflows } from "@/lib/data";
import type { Grade } from "@/lib/data";
import { OriginBadge, VerdictStamp } from "@/components/chips";
import FleetTable from "./FleetTable";
import LeadCapture from "./LeadCapture";
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
          </div>

          <SettlementFunnel />

          <p className="mt-6 max-w-2xl font-mono text-xs leading-relaxed text-ink/60">
            One {company.headcount}-person company&rsquo;s June — and the decisions were worth{" "}
            {fmt.usd(headers.projectedVerdictImpact)}/mo,{" "}
            {Math.round((headers.projectedVerdictImpact / headers.spend) * 100)}% of its agent
            spend.{" "}
            <Link href="/demo" className="underline underline-offset-4">
              See the statement →
            </Link>
          </p>

          {/* The outcomes themselves — concrete, or the claim is abstract */}
          <div className="rule mt-12 border-t">
            {[
              ["Zendesk", "Ticket resolved"],
              ["Stripe", "Payment settled · Refund processed"],
              ["Salesforce", "Opportunity created"],
              ["ServiceNow", "Workspace provisioned"],
              ["Google Drive", "Document approved"],
              ["Jira", "Ticket created from meeting notes · Issue closed"],
            ].map(([source, event]) => (
              <div
                key={source}
                className="rule flex items-baseline justify-between gap-4 border-b py-2.5"
              >
                <span className="eyebrow text-ink/60">{source}</span>
                <span className="text-right text-[15px]">{event}</span>
              </div>
            ))}
            <p className="mt-3 text-sm text-ink/70">
              Whatever the outcome, if it lands in a system of record, Causa verifies it — and
              ties it to whatever did the work.
            </p>
          </div>
        </section>

        {/* §2 The stakes */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          {[
            "Outcome pricing is becoming software's default.",
            "Every outcome invoice is currently self-reported.",
            "The payer has no independent record. You're the payer.",
            "Causa is that record — the system of record for what your AI workforce actually delivers.",
          ].map((line) => (
            <Reveal key={line} className="rule border-t py-6">
              <p className="font-serif text-2xl sm:text-3xl">{line}</p>
            </Reveal>
          ))}
          <div className="rule border-t" />
        </section>

        {/* §3 The two buyers — one ledger, read at two altitudes */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="rule grid border-y md:grid-cols-2">
            <Reveal className="py-8 md:border-r md:border-hairline md:pr-10">
              <p className="eyebrow text-ink/60">CFO</p>
              <h2 className="mt-2 font-serif text-3xl">An Agent P&amp;L, finally.</h2>
              <dl className="mt-5 text-[15px]">
                {(
                  [
                    ["Spend by vendor and model", fmt.usd(headers.spend)],
                    ["Verified value delivered", `${fmt.int(headers.verified)} outcomes`],
                    ["Cost per verified outcome", "$0.42–$9.24"],
                    ["Adjustments recovered", fmt.usd(headers.adjustmentIdentified, 2)],
                  ] as const
                ).map(([label, figure]) => (
                  <div
                    key={label}
                    className="rule flex items-baseline justify-between gap-4 border-t py-2.5"
                  >
                    <dt className="text-ink/80">{label}</dt>
                    <dd className="font-mono text-sm">{figure}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-ink/60">Invoice-grade, export-ready.</p>
            </Reveal>
            <Reveal delay={0.08} className="rule border-t py-8 md:border-t-0 md:pl-10">
              <p className="eyebrow text-ink/60">Operating leader</p>
              <h2 className="mt-2 font-serif text-3xl">
                Performance reviews for your digital workforce.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink/80">
                Every workflow scored against its baseline, stamped with a verdict, next step
                drafted.
              </p>
              {/* One specimen row from the roster */}
              {(() => {
                const support = workflows.find((w) => w.id === "support")!;
                return (
                  <div className="rule mt-6 border-t pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{support.name}</p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-ink/70">
                          <OriginBadge origin={support.origin} />
                          {fmt.int(support.verified)} verified · {support.qualityPassPct}%
                          quality
                        </p>
                      </div>
                      <Stamp>
                        <VerdictStamp verdict={support.verdict} label={support.verdictLabel} size="sm" />
                      </Stamp>
                    </div>
                  </div>
                );
              })()}
            </Reveal>
          </div>
          <Reveal className="mt-6">
            <p className="font-serif text-xl italic text-ink/80">
              One record. It cascades — board deck to team standup.
            </p>
          </Reveal>
        </section>

        {/* §4 How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16">
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
                "Agent, model, or person — each claimed result checked against the record.",
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
          <div className="mt-10">
            <Tiers />
          </div>
        </section>

        {/* §5 Evidence, graded */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal>
            <h2 className="font-serif text-4xl sm:text-5xl">
              Not all proof is equal. We grade ours.
            </h2>
          </Reveal>
          <div className="mt-8 max-w-3xl">
            {GRADES.map((g, i) => (
              <Reveal key={g} delay={i * 0.05} className="rule flex gap-5 border-t py-6">
                <Stamp delay={0.1}>
                  <span className="flex h-14 w-14 items-center justify-center border-2 border-ink font-serif text-3xl">
                    {g}
                  </span>
                </Stamp>
                <div>
                  <h3 className="font-serif text-2xl">{gradeDescriptions[g].name}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink/80">
                    {gradeDescriptions[g].line}
                  </p>
                </div>
              </Reveal>
            ))}
            <div className="rule border-t" />
          </div>
          <Reveal className="mt-8">
            <p className="max-w-3xl text-[15px] leading-relaxed text-ink/70">
              Every Causa verdict carries its grade — and the path to a better one.
            </p>
          </Reveal>
        </section>

        {/* §6 The Fleet Standard */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal>
            <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
              Built or bought, every agent answers to the same bar.
            </h2>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink/80">
              You&rsquo;ll build some agents and buy more. One standard for the whole fleet:
              verified outcomes per dollar, graded evidence, same ledger.
            </p>
          </Reveal>
          <div className="mt-8">
            <FleetTable />
          </div>
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
              <p className="mt-2 max-w-xl text-[15px] text-ink/70">
                June&rsquo;s meeting-booker: meetings from the agent-only slice convert 8% vs.
                11% without it. <span className="font-serif text-2xl text-verdict">RETIRE</span>{" "}
                — $2,900/mo recovered.
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
              Agent vendors: your buyers are going to ask who verified your outcomes. Get Causa
              Verified before they do.
            </p>
          </div>
        </section>

        {/* §9 Founder block + final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <p className="max-w-3xl text-[15px] leading-relaxed text-ink/80">
              Built by the operator who ran partner attribution at a $5B-ARR data company —
              crediting logic, incentive design, and outcome measurement for the messiest actors
              in B2B: humans. Agents are the easy part.
            </p>
          </Reveal>
          <Reveal className="mt-14">
            <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
              First Verified Outcome Statement in 7 days.
            </h2>
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
          </Reveal>
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
