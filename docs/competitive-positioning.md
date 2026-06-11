# Compass Competitive Positioning

**Status:** Strategy draft — June 2026
**Question this answers:** Salesforce bought m3ter, Databricks shipped Unity AI Gateway, Sierra sells outcome-priced agents. What can Compass do that none of them structurally can — and what does that let a business *do*, not just *see*?

---

## TL;DR

> **Compass is OpenRouter at the agent layer.** Declare the outcome, and Compass routes the work to whichever agent — any vendor, any runtime — delivers it for the least money, with every result verified against your own systems of record. Salesforce meters what it bills, Databricks sees what crosses its gateway, Sierra grades the agents it sells. Only a neutral party can route between all of them.

Compass is not a dashboard or a Gartner-style benchmark aggregator. It is a **service** that matures along a ladder, where each rung is sold on its own and earns the right to the next:

```
observe  →  recommend  →  enforce  →  route
(today)     (receipts)    (policies)   (the control plane)
```

The measurement layer — the outcome ledger — is not the product. It is the **routing brain** that makes the service possible, and the reason nobody else can build it.

---

## 1. The service: an outcome-routed control plane for agent work

OpenRouter won at the model layer by sitting between buyers and every provider, routing each request on price and latency through one API and one bill. Compass does the same one layer up, with a better routing signal: **verified outcome-per-dollar**.

What a business can do with Compass that it cannot do today:

**Submit work, not pick vendors.**
Declare an outcome and an SLA — "resolve this ticket," "ship this fix," "collect this invoice." Compass dispatches the task to the best available executor (Claude Code agent, Agentforce, Sierra, an in-house fleet), fails over when an agent stalls, and escalates to a human when confidence drops. Agent fleets become callable infrastructure, the way a CDN is.

**Break vendor lock-in with live leverage.**
The ledger shows Sierra and a cheaper in-house agent resolving tickets at the same verified rate. Compass shifts 30% of volume, and the renewal negotiation writes itself. Every walled garden's pricing power depends on this comparison *not existing*.

**Pay for outcomes, audited.**
Outcome-based pricing is exactly what Salesforce bought m3ter to bill for — but the seller cannot also be the scorekeeper. Compass verifies outcome-based contracts as the neutral party that sells neither the agents nor the compute. We are the settlement layer, not the scoreboard.

**Canary anything safely.**
New model, new prompt, new vendor: route 5% of live work to it, get a verified outcome delta against the incumbent, auto-promote or roll back.

---

## 2. The routing brain: the outcome ledger

You cannot route on outcome-per-dollar without owning verified, cross-runtime outcome data. That is the ledger, and it rests on one architectural decision:

### Attribution is a query, not an event

Compass stores **immutable raw evidence** — transcripts, tool calls, source-system events — and computes outcome attribution as a *function over that evidence*, rather than emitting fixed outcome events at log time. The seed of this already ships in `compass-cli`: `src/attribute/index.js` derives outcomes (commits, pushes, tests passed, MCP actions) at scan time from raw session transcripts, not from pre-tagged telemetry.

Three properties fall out:

1. **Runtime neutrality.** Compass doesn't need to sit in the request path or own the runtime. Evidence-based attribution works on any agent's exhaust — which is what makes "ingest from any source" possible.

2. **Outcomes anchored at the external system of record.** A "merged PR" is verified in GitHub. A "closed ticket" is verified in Zendesk. A "revenue event" is verified in Stripe. The outcome is defined and confirmed *where it actually lives*, not in the vendor's own schema. No self-grading.

3. **Versioned outcome definitions with retroactive re-attribution.** Desired outcomes drift — every quarter, what "success" means changes. Because attribution is a query over immutable evidence, Compass re-runs the *new* definition over the *full historical record*: your entire history re-prices itself. This is the hard problem, and it is also the moat:
   - m3ter structurally can't — invoices are final; you cannot re-bill the past.
   - Unity AI Gateway can't — its trail stops at the inference table; it never knew the external outcome.
   - Sierra won't — its outcome metric is the contract.

4. **Cross-source credit deduplication.** One agent action that touches GitHub + Linear + Slack counts once, toward one outcome. Only possible when you pool sources — which none of the walled gardens do.

---

## 3. The improvement loop: recommendations with receipts

Compass already ships an improvement layer, not just visibility: a rules-based recommender (`compass/core/recommender.py`) with six action types — trim context, fix prompt regression, clone best performer, add guardrail, rate-limit, restructure input — each with estimated savings, plus Clone Studio and a guardrail blueprint library. Today it optimizes cost proxies. The ledger upgrades it into something no competitor can offer:

**Recommendations with receipts.**
Recommend → apply → re-measure verified outcomes over N days → confirm or auto-rollback. "We told you to demote this agent to Haiku; 14 days later: merged-PR rate unchanged, cost down 81% — confirmed." Compass becomes the only optimizer that can *prove its own advice worked* — and every confirmed or rolled-back recommendation is proprietary training data the walled gardens cannot collect.

**ROI-denominated recommendations.**
Not "input tokens are 2× fleet median" but "this agent costs $412/month for 2 merged PRs; its peer ships 14 at half the cost — here is the prompt diff, mined from the winner's transcripts."

**Fleet capital allocation.**
Treat compute budget like a portfolio. Compass recommends rebalancing spend and model tiers across agents based on measured outcome-per-dollar elasticity — verified model-demotion trials, not flat budget caps.

**The enforce rung.**
Guardrails today are defined but not enforced. A lightweight enforcement shim (Claude Code hooks first, gateway proxy later) turns every confirmed recommendation into a one-click live policy. Advisor → autopilot, with each escalation justified by the evidence trail.

---

## 4. The landscape — and why none of them can follow

| | What they actually do | Visibility boundary | Outcome model | Why they can't route |
|---|---|---|---|---|
| **Salesforce + m3ter** | Metering/rating for consumption- and outcome-based *billing* in Agentforce Revenue Management | Agentforce / Salesforce cloud | Whatever the invoice contract says; frozen at billing time | Won't route work away from Agentforce |
| **Databricks Unity AI Gateway** | Token-level cost attribution, payload logging, budgets — for traffic routed through the gateway | The gateway; trail stops at the inference table | Knows what compute *cost*, not what it *accomplished* externally | Routes tokens, not tasks; bound to lakehouse compute |
| **Sierra** | Builds, runs, and grades its own outcome-priced agents | Sierra agents only | Contractually fixed, self-graded | Won't route to a competitor's agent |

The shared constraint: **each one's attribution is downstream of what it monetizes.** Their measurement exists to serve their lock-in — billing finality (Salesforce), request-path coupling (Databricks), self-grading (Sierra).

And the deeper reason the routing layer is safe: **a router must be neutral.** Their revenue depends on being the *destination* for agent work. Compass's revenue depends on picking the best destination. An incumbent that routes honestly cannibalizes itself; that is not a feature gap they can close, it is a business model they cannot adopt.

The analogy register underneath the router: Nielsen for ads, the independent auditor. The referee can't also be a player.

---

## 5. The flywheel

```
work routed through Compass
        ↓
verified outcome evidence accrues
        ↓
routing decisions sharpen (and recs get receipts)
        ↓
better outcomes per dollar than any single vendor
        ↓
more work routed through Compass
```

Side effects of the flywheel, sold as features rather than the product:

- **Cross-fleet benchmarking network.** Runtime neutrality enables anonymized cross-company benchmarks — "your code-review agents cost 3.2× the network median per merged PR." A data network effect structurally unavailable to single-platform vendors.
- **"Compass-verified" agent scorecards.** Long-run, the procurement standard: vendors submit to verification because buyers demand it.

---

## 6. Shipped today vs. what we must build

Honesty about the gap is part of the pitch — the architecture is proven in miniature, and each rung of the ladder is independently sellable.

**Shipped (the wedge):**
- `compass-cli`: zero-setup local scan of Claude Code fleets; evidence-derived outcomes (commits, pushes, files, tests, MCP actions) computed at scan time from raw transcripts (`src/attribute/index.js`); per-model cost attribution (`src/pricing/`)
- Compass dashboard: health scoring (`compass/core/agent_scorer.py`), six-rule recommender with estimated savings (`compass/core/recommender.py`), guardrail definitions, prompt version lineage

**To build, in ladder order:**
1. **Evidence store** — durable, append-only store for raw agent exhaust beyond `~/.claude/` (the substrate for retroactive re-attribution)
2. **Source connectors** — agent runtimes beyond Claude Code (OpenAI agents, Agentforce exhaust, in-house frameworks) and systems of record (GitHub, Zendesk, Stripe, Linear)
3. **Outcome definitions as versioned objects** — user-defined outcomes with full re-attribution across history on definition change
4. **Cross-source entity resolution** — joining one agent action across multiple systems; credit dedup
5. **Recommendation verification loop** — auto before/after measurement, confirm/rollback
6. **Enforcement shim** — Claude Code hooks, then gateway proxy
7. **Dispatch layer** — the router itself: outcome declaration API, executor selection, failover, escalation

---

## 7. Objection handling

**"Databricks could add external connectors."**
They could log external events, but their attribution remains gateway-coupled and their incentive is to maximize lakehouse compute, not to tell you a cheaper non-Databricks path produced the same outcome. Routing away from their own compute is revenue-negative for them.

**"Salesforce could open Agentforce metering to third-party agents."**
m3ter exists to *bill*. Billing requires finality; the ledger requires re-computability. And Salesforce verifying that a non-Salesforce agent is cheaper per outcome is a sales objection generator, not a product they will fund.

**"Sierra already does outcome-based pricing."**
Sierra *prices* on outcomes it defines and grades itself, for its own agents, in one vertical. That's a pricing model, not an attribution system. Compass is the party a buyer brings in to check Sierra's math — and then to route around Sierra when the math says so.

**"Isn't this just observability (Langfuse/LangSmith/Braintrust)?"**
Trace observability stops at the trace. Compass's unit of account is the *business outcome in the external system of record*, its definitions are versioned and retroactive, and the end state is routing — a control plane, not a debugging tool.

**"Routing agent work is hard; outcomes take days to materialize."**
Correct — which is why the ladder matters. Observe and recommend monetize immediately on data we can already collect; enforce and route ship only where outcome latency and evidence density support them (code agents first: outcomes are merged PRs and passing tests, verifiable in hours).

---

## Sources

- [Salesforce signs definitive agreement to acquire m3ter](https://www.salesforce.com/news/stories/salesforce-signs-definitive-agreement-to-acquire-m3ter/) — Salesforce Newsroom
- [What's new in Unity AI Gateway: service policies, guardrails, observability, and cost controls](https://www.databricks.com/blog/whats-new-unity-ai-gateway-service-policies-guardrails-observability-and-cost-controls-ai) — Databricks Blog
- [Monitor Unity AI Gateway cost (Beta)](https://learn.microsoft.com/en-us/azure/databricks/ai-gateway/cost-observability-beta) — Microsoft Learn
- [Governing AI agents at scale with Unity Catalog](https://www.databricks.com/blog/governing-ai-agents-scale-unity-catalog) — Databricks Blog
