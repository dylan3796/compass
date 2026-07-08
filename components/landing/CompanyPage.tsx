"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/motion";
import { fmt, market } from "@/lib/data";
import LeadCapture from "./LeadCapture";
import SiteFooter from "./SiteFooter";
import SiteNav from "./SiteNav";

/**
 * /company — the thesis, the timing, and who's behind it. The landing sells
 * the record; this page says why the referee seat has to exist at all.
 */
export default function CompanyPage() {
  const [leadOpen, setLeadOpen] = useState(false);

  return (
    <div className="bg-paper">
      <SiteNav onGetStatement={() => setLeadOpen(true)} />

      <main>
        {/* The thesis */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:pt-20">
          <p className="eyebrow text-ink/60">Company</p>
          <h1
            className="mt-4 max-w-4xl font-serif leading-[1.05]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Machine labor needs a referee.
          </h1>
          <div className="mt-10 max-w-3xl">
            {[
              "Software is moving from paying for time to paying for results — per resolved ticket, per provisioned account, per booked meeting.",
              "Every one of those invoices is self-reported by the party getting paid. The agent's maker can't be the agent's referee.",
              "Causa is the independent record of what that work is worth — priced, settled, and turned into the next move. Payer-funded, permanently.",
            ].map((line) => (
              <div key={line} className="rule border-t py-5">
                <p className="font-serif text-2xl leading-snug sm:text-3xl">{line}</p>
              </div>
            ))}
            <div className="rule border-t" />
          </div>
        </section>

        {/* Why now */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">Why now</h2>
          <div className="mt-8 grid max-w-4xl gap-x-12 sm:grid-cols-2">
            <div className="rule border-t py-5">
              <p className="font-sans text-3xl font-semibold tracking-tight">
                {fmt.usd(market.finPerResolution, 2)}
                <span className="text-base font-normal text-ink/60"> / resolution</span>
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
                What the market&rsquo;s biggest support agent bills per outcome — a vendor that
                just sold for ${market.finAcquisitionBn}B. Outcome pricing is already the
                default at the top of the market.
              </p>
            </div>
            <div className="rule border-t py-5">
              <p className="font-sans text-3xl font-semibold tracking-tight">
                {fmt.usd(market.medianMonthlyAiSpend)}
                <span className="text-base font-normal text-ink/60"> / mo median</span>
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
                What the median company spends on AI while the top 1% runs hundreds of times
                that. The second wave hasn&rsquo;t bought yet — and it will demand proof before
                it does. The record should exist first.
              </p>
            </div>
          </div>
        </section>

        {/* The ladder */}
        <section className="rule border-y py-20">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <h2 className="font-serif text-5xl sm:text-7xl">Meter</h2>
              <p className="mt-2 max-w-xl text-[15px] text-ink/70">
                Verify. Every claimed outcome proved where it lands, then asked: would it have
                happened anyway?
              </p>
            </Reveal>
            <Reveal className="mt-14">
              <h2 className="font-serif text-5xl sm:text-7xl">Verdict</h2>
              <p className="mt-2 max-w-xl text-[15px] text-ink/70">
                Act. Every statement ends in a decision with the dollar impact attached — and
                three of the five need no vendor conversation.
              </p>
              <p className="mt-3 font-mono text-xs tracking-wide text-ink/60">
                REPRICE · REROUTE · RENEGOTIATE · RETIRE · EXPAND
              </p>
            </Reveal>
            <Reveal className="mt-14">
              <h2 className="font-serif text-5xl sm:text-7xl">Standard</h2>
              <p className="mt-2 max-w-xl text-[15px] text-ink/70">
                Every statement sharpens the Benchmark. &ldquo;Causa Verified&rdquo; is how
                vendors will prove value — and how buyers will set price.
              </p>
            </Reveal>
            <Reveal className="mt-14">
              <p className="max-w-3xl font-serif text-2xl leading-snug sm:text-3xl">
                Every economy that pays for results built a verification layer beside it —
                audits, ratings, ad verification, payment networks. Machine labor is next.
                Causa is that layer.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Sell-side strip */}
        <section className="bg-ink py-10 text-paper">
          <div className="mx-auto max-w-6xl px-4">
            <p className="max-w-3xl font-serif text-xl sm:text-2xl">
              Agent vendors: enterprise buyers are going to ask who verified your outcomes. Get
              Causa Verified before they do.
            </p>
          </div>
        </section>

        {/* Founder + final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <p className="eyebrow text-ink/60">Who&rsquo;s behind it</p>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink/80">
            Built by the operator who ran partner attribution at a $5B-ARR data company —
            crediting logic, incentive design, and outcome measurement for the messiest actors
            in B2B: humans. Agents are the easy part.
          </p>
          <div className="mt-14">
            <h2 className="max-w-3xl font-serif text-4xl sm:text-5xl">
              Minutes to proof. Days to your first statement.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] text-ink/70">
              Pilot from $7,500, credited against your first year. Two exports and a join key.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button className="btn-ink" onClick={() => setLeadOpen(true)}>
                Get statement
              </button>
              <Link
                href="/demo"
                className="flex min-h-[44px] items-center text-[15px] font-medium underline-offset-4 hover:underline"
              >
                See the product →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      {leadOpen && <LeadCapture onClose={() => setLeadOpen(false)} />}
    </div>
  );
}
