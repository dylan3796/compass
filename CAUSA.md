# CAUSA — Vision & Product Doctrine
### What this company is, why it wins, and the rules we build by.
*Founding document, July 2026. Lives at the repo root. Every build session, product decision, and pitch inherits from this file. The landing-page spec (causa-plan) is the expression; this is the substance.*

*How to read this: Sections 1–5 are written for anyone in an organization — a CFO, a department head, or a manager whose team spun up its first agents last quarter. Sections 6–8 carry the technical and business detail for the people who need it. If a sentence up front requires an engineering degree, it's a defect.*

---

## 1. The one-paragraph company

Software is moving from paying for people's time to paying for results. AI agents now close support tickets, set up new employees' accounts, draft proposals, and book sales meetings — and the vendors behind them bill you for each result. But here's the problem: the party reporting the result is the party getting paid. **The vendor grades its own homework.** Causa is the independent layer that checks the work. We answer three questions any manager would ask about a new hire — *Did they actually do the work? Would it have gotten done without them? What are they really costing us per result?* — and we turn every answer into a next step. Causa doesn't report outcomes. It settles them.

## 2. The problem, told at ground level

Picture a 140-person company — call it Meridian — a year into its agent adoption:

- **The support manager** bought an AI agent that charges $1.50 per resolved ticket. The vendor's dashboard says 3,214 resolutions this month. Her gut says a chunk of those tickets bounced back within a week — but the vendor's dashboard doesn't have a "came back angry" column, and she has no independent count. She pays the invoice.
- **The IT lead's team built their own agent** to set up accounts for new hires. It works great — he thinks. Nobody can tell him what it saves versus the old way, so at budget time it's a line item with a shrug attached, and his ask to build two more agents dies in review.
- **The sales director** pays $2,900/month for an AI agent that books meetings. Meetings happen. But her reps quietly believe most of those meetings would have been booked anyway — the agent is taking credit for pipeline the team already earned. Nobody can prove it either way, so the argument repeats every month.
- **The CFO** sees all of this as one growing line item — agent spend, up and to the right — with no equivalent of a P&L behind it. She can tell you the ROI of a salesperson, a contractor, or a software seat. She cannot tell you the ROI of the agent workforce. Nobody can.

Four people, four versions of the same missing thing: an independent record of what the agents actually delivered. That record is the product.

## 3. Why this company must exist (the thesis)

1. **Paying for results is becoming software's default.** Per-resolved-ticket, per-provisioned-account, per-booked-meeting. And every one of those invoices is currently self-reported by the seller.
2. **The #1 thing stalling the agent economy is doubt.** Companies that can't verify what an agent accomplished can't justify renewing it, can't dispute an invoice, can't compare two vendors, and can't decide whether to build more. Doubt freezes budgets.
3. **Every economy that pays for results grows a checking layer beside it.** Financial statements got audits. Credit got ratings. Online ads got verification. Payments got networks. Machine labor is the next results-priced economy, and its checking layer doesn't exist yet. Causa is that layer.
4. **The AI labs can't build this.** A tool from the agent's own maker verifying that agent's invoices is the fox counting the henhouse. Independence isn't a feature they can add — it's structurally impossible for them. That's our permanent moat against the scariest names on the org chart.
5. **More models make us more valuable, not less.** Open-weight models, overseas models, internal fine-tunes — the average company's agents will run on many engines. Nobody making an engine can fairly compare all engines. Causa records *which model did each piece of work* as a basic attribute, so "cost per result, by model" becomes something a buyer can act on. Every new model released makes that comparison worth more.
6. **The second wave is the prize.** Agent adoption is a power law: the median company spends ~$2.2K/mo on AI while the top 1% spends hundreds of times more per employee (Ramp AI Index, 2026). The long tail hasn't moved yet — even people inside the leading agent vendors say the growth hasn't fully caught. The first wave bought agents; the second wave will demand proof before it renews, expands, or trusts an invoice. A record is most valuable when it starts before the thing it records gets big. Causa builds the record ahead of the wave.

## 4. The product, in plain terms

### 4.1 The outcome contract — three questions per outcome
Everything Causa tracks is defined by three plain questions. This trio is the core IP, and it reads like common sense on purpose:
- **What has to happen?** (The event, in a system you already trust: ticket resolved in Zendesk, account live in ServiceNow, opportunity created in Salesforce, proposal approved.)
- **What makes it count?** (The quality bar: ticket didn't come back within 7 days; new hire actually logged in within 48 hours; proposal approved without a rewrite.)
- **Would it have happened anyway?** (The baseline: compared to before the agent, to a slice of work the agent doesn't touch, or to the humans doing the same job.)

If it lands in a system of record, Causa can verify it. Revenue results and internal results — tickets, provisioning, documents — are equals here. Internal results are often the better starting point, because "the account works or it doesn't" leaves nothing to argue about.

### 4.2 The settlement funnel — where the truth shows up
Every month, for every workflow, one funnel: **Claimed → Verified → Real contribution.**
- *Claimed:* what the agent or vendor says it did. (Meridian's support agent: 3,214 resolutions.)
- *Verified:* claims that actually happened and passed the quality bar. (2,802 — because 412 didn't hold up, including 61 tickets that bounced back within the week.)
- *Real contribution* (we call it *attributable*): verified results that wouldn't have happened anyway. (1,989 — the agent's honest impact.)
The gap between what was claimed and what was real, priced in dollars, is the product's value made visible. It's also where every billing adjustment, renegotiation, and build-versus-buy decision lives.

### 4.3 Verdicts — because a number without a next step is trivia
Every workflow's statement ends in one of five stamps, each with the evidence attached, the dollar impact projected, and the follow-through drafted:
- **Reprice** — the result is worth less (or more) than what's being billed.
- **Reroute** — same work, cheaper engine or vendor, same quality. (Meridian's proposal agent: identical approval rate on a cheaper model, $3.10 → $1.21 per document.)
- **Renegotiate** — the vendor's real contribution is lower than the invoice implies. (Support agent: 71% of resolutions were truly incremental → a fair price of $1.06, not $1.50 — and the email making that case is pre-drafted.)
- **Retire** — the agent isn't beating "doing nothing." (The meeting-booker: reps convert 11% on their own; agent-sourced meetings convert 8%. Cancel, recover $2,900/month.)
- **Expand** — it's working; do more of it. (The homegrown IT agent: 9× faster than the old process at a fraction of the cost — the evidence that gets the next two agents funded.)
This is the difference between reporting the news and refining the outcome. Dashboards describe; Causa decides.

### 4.4 Evidence, graded — how much to trust each verdict
Not all proof is equal, and we say so. Every verdict carries a grade:
- **A** — a slice of work the agents never touch, kept aside as a clean comparison. The strongest proof there is.
- **B** — proof mined from changes you already made: a staged rollout, a model switch, a routing change.
- **C** — your own history from before the agents, matched and compared.
- **D** — sound logic and rules. Where every engagement starts; never where it has to end.
The grade does three jobs: it keeps us honest, it shows customers exactly how to get stronger proof (want an A-grade number to take into a vendor negotiation? we'll help you set up the holdout), and it builds the graded dataset that pays off as causal analysis keeps getting better — the companies collecting graded evidence today will be the ones who trust their numbers tomorrow.

### 4.5 The intelligence — a record you can ask
Because every activity is captured and every outcome joined, the record answers questions, not just reports: *Why did support cost more in June? Which runs touched this ticket? What should the notes agent stop doing?* And it acts on what it learns — surfacing outcomes you weren't measuring, recommending where to point agents next, flagging when it's time to retune an agent's instructions, clone it into an adjacent workflow, or cut it — and reading your fleet against the market through the Benchmark (your cost per result vs. the market's, sharpened by every statement). If you're doing a thing one way, Causa can show you the better way another fleet already found. The causal core stays sealed and deterministic (§6.3); the intelligence interprets and recommends on top of it.

## 5. The cascade — one record, every level of the org

This is the go-to-market shape and the product shape at once: **one record, read differently at every altitude.** Causa is not a tool one team uses; it's a record the whole organization argues from. That's what makes it the outcome layer rather than another point solution.

- **The CFO** reads it as the **Agent P&L**: spend by vendor and by model, verified value delivered, cost per real result, adjustments recovered. Finally, the agent workforce speaks the same language as every other line item. Export-ready for the board deck.
- **The CTO / platform owner** reads it as the **fleet standard**: every agent — built in-house, bought from a vendor, or hybrid — held to the same bar, with cost-per-result-by-model as a procurement and architecture weapon. Not another engineering dashboard; the scoreboard engineering's work is judged by.
- **The department head** reads it as the **program answer**: is the agent initiative working, where should the next dollar go, what gets expanded and what gets retired — with evidence grades attached so decisions survive scrutiny.
- **The line manager** — including the one whose team spun up three agents on their own last quarter — reads it as the **team page**: every workflow as a worker, with output, quality rate, cost per result, and a trend line. *Performance reviews your agents never had.* This is the person the product must delight, because this is where agents actually live day to day.

**Entry can happen at any altitude.** A CFO who wants the P&L. A manager who wants to know if her three homegrown agents are any good. Either door opens the same record — and because it's one record, it spreads: the manager's team page rolls up into the department answer, which rolls up into the P&L. Land anywhere; cascade everywhere. The one place we deliberately don't land first: engineering. They already have observability tools; ours is the layer those tools can't provide, and positioning it as an eng tool is how it dies as a point solution.

*(One boundary, stated plainly: Causa reviews workflows, not people. Humans appear as baselines and as partners in hybrid workflows — never as individual surveillance. We measure the work, not the worker.)*

---

## 6. Architecture doctrine (for the technical reader)

1. **Consume, don't own, the plumbing.** Activity comes from what exists: LangSmith, Langfuse, OpenTelemetry GenAI conventions, provider logs, raw exports. Outcomes come from systems of record: Zendesk, Salesforce, Jira, ServiceNow, billing, document workflows. We build ingestion only when a customer's stack forces it. No SDK. No proxy. Nothing to rip out.
2. **Own the join and the verdict.** Causa's proprietary layer is the actor model, the run→entity→outcome contribution graph, and the deterministic verdict engine. That is the moat surface; everything else is commodity. The join is the genuinely hard part, and it is structurally unclaimed: join keys hide in unstructured tool-call payloads; some agent work (browser actions, copy-pasted drafts) never logs; hybrid workflows split credit across actors. Everyone adjacent has a reason to stop exactly where the join begins — observability stops at the trace boundary because its buyer is the engineer; systems of record see outcomes but no agent activity and no incentive to credit a vendor's agent; the labs are disqualified by conflict; billing rails need the answer but won't own the data mess. Being best, not first, is measured three ways: the join engine's coverage rate (what share of outcomes joins automatically — stated honestly, "61% joinable" is a feature), replay-based credit for multi-actor work, and the graded-evidence dataset that compounds with every statement.
3. **The causal core is sealed and deterministic.** LLMs are confined to ingestion, interpretation, and narrative. Verdicts come from replayable, deterministic logic — a verdict you can't replay is a verdict you can't defend in a billing dispute. Start with rule-based counterfactuals; graduate to quasi-experimental methods (diff-in-diff, synthetic control) as customers supply Grade B/C data; Shapley-via-replay for multi-actor credit when hybrid workflows demand it. Agent attribution is NOT channel attribution — agent actions are compositionally dependent and counterfactuals are re-executable, so first/last-touch heuristics don't transfer; replay-based credit does.
4. **Model is a recorded attribute of every run.** One schema decision that yields cost-per-outcome-by-model as a native primitive and future-proofs the product against any model landscape.
5. **The data contract has a floor, stated honestly and early.** Per workflow, verification requires exactly three things: activity records (who/what ran, when, against which entity), outcome records (what happened to that entity, per the quality bar), and the join key linking them. Tier 0 = two exports and a join key — a pilot needs no integration project. Tier 1 = one live activity source + one system of record. Tier 2 = the full ledger. We tell customers what's verifiable with what they've connected — and the evidence-grade ceiling it implies — before they pay anything.

## 7. Business doctrine

1. **Payer-funded, permanently.** Causa's customer is the party paying for outcomes. Vendor-side revenue ("Causa Verified" — vendors using our independent proof to close enterprise deals) comes only after payer-side trust is established, and never becomes the majority of revenue. Whoever pays the referee owns the referee; we choose our owner deliberately. Written down now so it survives temptation later.
2. **Revenue before code.** The wedge is the Verified Outcome Statement pilot: $7.5K–$15K, delivered within 7 days of data receipt, concierge-produced while the product automates behind it. Every pilot must pull toward a standing subscription (target ≥50% conversion by design partner #5) or the productization slope isn't real and we reassess.
3. **Benchmark rights from pilot #1.** Anonymized, aggregated contribution to the Causa Benchmark — what results actually cost, by workflow, by vendor, by model, across companies — is contracted in every engagement from the first. The Benchmark is the compounding asset, the eventual pricing standard for machine labor, and the fundraise story.
4. **The 90-day kill gate.** If three companies won't pay for a statement, the pain isn't acute enough yet — pause, keep the thesis, revisit in two quarters. Conviction about the destination; ruthlessness about the timing.
5. **ICP wedge — start where the invoices are biggest.** Companies already paying outcome- or usage-priced agent contracts at $20K+/mo, explicitly including enterprises on six-figure agent contracts (the Sierra/Decagon class of buyer), where a finance or ops leader owns the AI budget. The spend distribution is a power law: today's revenue lives in the top decile of spenders, so we sell there first. The manager-level door (someone's homegrown fleet) stays open as the second-wave path — the long tail arrives later, and the record should be waiting for them. Upmarket-first, downmarket-ready.

## 8. Competitive doctrine

- **Observability (LangSmith, Langfuse/ClickHouse, Arize, Braintrust, Datadog…): suppliers, never competitors.** They sell traces and evals to engineers; we consume that exhaust and sell settlement to the rest of the org chart. We never describe ourselves with their words — observability, tracing, evals, monitoring — because their buyer and their question are different. Their commoditization makes our raw material cheaper.
- **Billing/metering (Metronome, Chargebee, Nevermined, Stripe's agent work): distribution partners.** They move money and need a source of truth to move it against. Integration target, not battleground; watch for them creeping into verification — our defense is the payer-side seat and speed to the neutral-referee brand.
- **The labs (Anthropic, OpenAI, Google): structurally disqualified.** The fox can't count the henhouse, and no lab sees a mixed fleet. We consume their instrumentation gratefully.
- **The real race** is against another independent claiming the referee seat first. Speed to brand, benchmark mass, and graded evidence are the defenses.

## 9. Language doctrine

The voice of a settlement institution with a plain-spoken streak: short declaratives, numbers over adjectives, examples a manager retells at lunch. Canonical lines, verbatim everywhere:
- *The vendor shouldn't grade its own homework.*
- *Causa doesn't report outcomes. It settles them.*
- *Would it have happened anyway?*
- *Two exports and a join key.*
- *Not all proof is equal. We grade ours.*
- *Built or bought, every agent answers to the same bar.*
- *Performance reviews your agents never had.*
- *One record. It cascades — board deck to team standup.*
- *We measure the work, not the worker.*
Claims hygiene: settlement vocabulary is product language, never a claim to perform accounting, audit, or assurance services; the disclaimer travels with the brand.

## 10. What Causa is NOT (scope discipline)

Not an observability or eval platform. Not an agent builder or orchestrator. Not a billing system — we never move money; we produce the truth money moves against. Not employee surveillance. Not a consulting firm — services exist only as the wedge that trains the product. Not an engineering tool that the rest of the company never opens. And not a dashboard company — any screen that doesn't end in a decision is a defect.

## 11. How to use this document

- **In the repo:** this file is the product's soul; the build spec is one expression of it. When a build decision is ambiguous, this document decides. When they conflict, this document wins.
- **In Claude Code sessions:** load alongside CLAUDE.md so every session reasons from the thesis, not just the task.
- **With people:** Sections 1–5 are the pitch — to a design partner, a department head, or the manager with three homegrown agents. Sections 6–8 are the diligence layer for the CTO, the CFO, and the future technical co-founder, whose ask is precise: own the sealed causal core of Section 6 — the contribution graph, entity resolution at scale, replay-based credit — inside a company that already has revenue and a named seat: the referee.
