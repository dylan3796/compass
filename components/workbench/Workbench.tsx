"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  COLUMN_GUESSES,
  distinctValues,
  guessColumn,
  parseCsv,
  runWorkbench,
} from "@/lib/workbench";
import type { ParsedCsv, WorkbenchResult } from "@/lib/workbench";
import LeadCapture from "@/components/landing/LeadCapture";
import { Stamp } from "@/components/motion";

interface LoadedFile {
  name: string;
  csv: ParsedCsv;
}

const PASS_HINTS = [
  "ok",
  "resolved",
  "closed",
  "success",
  "won",
  "done",
  "true",
  "yes",
  "accepted",
  "approved",
  "active",
  "settled",
];

function looksLikePass(value: string) {
  const v = value.toLowerCase();
  return PASS_HINTS.some((h) => v.includes(h)) && !v.includes("reopen") && !v.includes("un");
}

/**
 * A status column with no value matching our hints (e.g. "pass"/"fail") must
 * not default to an empty pass set — the engine now (correctly) reads that
 * as "nothing verifies," which would greet the customer with a wall of
 * failures on first load. Fail open to "everything passes" instead, and let
 * the visible checkboxes invite them to narrow it down.
 */
function guessPassValues(vals: { value: string; count: number }[]): Set<string> {
  const guessed = vals.filter((v) => looksLikePass(v.value)).map((v) => v.value);
  return new Set(guessed.length > 0 ? guessed : vals.map((v) => v.value));
}

const fmtUsd = (n: number, d = 2) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtInt = (n: number) => n.toLocaleString("en-US");

function FilePanel({
  label,
  hint,
  file,
  onLoad,
}: {
  label: string;
  hint: string;
  file: LoadedFile | null;
  onLoad: (f: LoadedFile) => void;
}) {
  return (
    <div className="border border-hairline bg-white/40 p-5">
      <p className="eyebrow text-ink/60">{label}</p>
      <p className="mt-1 text-sm text-ink/70">{hint}</p>
      <label className="btn-outline mt-4 cursor-pointer text-sm">
        {file ? "Replace file" : "Choose CSV"}
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const text = await f.text();
            onLoad({ name: f.name, csv: parseCsv(text) });
          }}
        />
      </label>
      {file && (
        <p className="mt-3 font-mono text-xs text-ink/70">
          {file.name} — {fmtInt(file.csv.rows.length)} rows · {file.csv.headers.length} columns
        </p>
      )}
    </div>
  );
}

function ColumnSelect({
  label,
  headers,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  headers: string[];
  value: number;
  onChange: (i: number) => void;
  allowNone?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="eyebrow text-ink/60">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block min-h-[44px] w-full border border-ink/60 bg-paper px-3 py-2"
      >
        {allowNone && <option value={-1}>— none —</option>}
        {headers.map((h, i) => (
          <option key={`${h}-${i}`} value={i}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}

function FunnelBar({ label, value, max, green }: { label: string; value: number; max: number; green?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-ink/60">{label}</span>
        <span className={`font-serif text-2xl ${green ? "text-ledger" : ""}`}>{fmtInt(value)}</span>
      </div>
      <div className="mt-1.5 h-2 w-full bg-ink/10">
        <div
          className={`h-full ${green ? "bg-ledger" : "bg-ink"}`}
          style={{ width: `${max === 0 ? 0 : (value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function Workbench() {
  const [activity, setActivity] = useState<LoadedFile | null>(null);
  const [outcomes, setOutcomes] = useState<LoadedFile | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);

  const [activityKeyCol, setActivityKeyCol] = useState(-1);
  const [outcomeKeyCol, setOutcomeKeyCol] = useState(-1);
  const [agentCol, setAgentCol] = useState(-1);
  const [modelCol, setModelCol] = useState(-1);
  const [costCol, setCostCol] = useState(-1);
  const [statusCol, setStatusCol] = useState(-1);
  const [passValues, setPassValues] = useState<Set<string>>(new Set());

  const applyActivity = (f: LoadedFile) => {
    setActivity(f);
    setActivityKeyCol(guessColumn(f.csv.headers, [...COLUMN_GUESSES.joinKey]));
    setAgentCol(guessColumn(f.csv.headers, [...COLUMN_GUESSES.agent]));
    setModelCol(guessColumn(f.csv.headers, [...COLUMN_GUESSES.model]));
    setCostCol(guessColumn(f.csv.headers, [...COLUMN_GUESSES.cost]));
  };
  const applyOutcomes = (f: LoadedFile) => {
    setOutcomes(f);
    const key = guessColumn(f.csv.headers, [...COLUMN_GUESSES.joinKey]);
    const status = guessColumn(f.csv.headers, [...COLUMN_GUESSES.status]);
    setOutcomeKeyCol(key);
    setStatusCol(status);
    if (status !== -1) {
      const vals = distinctValues(f.csv, status);
      setPassValues(guessPassValues(vals));
    } else {
      setPassValues(new Set());
    }
  };

  const loadSamples = async () => {
    setLoadingSamples(true);
    const [a, o] = await Promise.all([
      fetch("/samples/sample-agent-activity.csv").then((r) => r.text()),
      fetch("/samples/sample-outcomes.csv").then((r) => r.text()),
    ]);
    applyActivity({ name: "sample-agent-activity.csv", csv: parseCsv(a) });
    applyOutcomes({ name: "sample-outcomes.csv", csv: parseCsv(o) });
    setLoadingSamples(false);
  };

  const statusOptions = useMemo(
    () => (outcomes && statusCol !== -1 ? distinctValues(outcomes.csv, statusCol) : []),
    [outcomes, statusCol]
  );

  const result: WorkbenchResult | null = useMemo(() => {
    if (!activity || !outcomes || activityKeyCol === -1 || outcomeKeyCol === -1) return null;
    return runWorkbench(activity.csv, outcomes.csv, {
      activityKeyCol,
      outcomeKeyCol,
      agentCol,
      modelCol,
      costCol,
      statusCol,
      passValues,
    });
  }, [activity, outcomes, activityKeyCol, outcomeKeyCol, agentCol, modelCol, costCol, statusCol, passValues]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="rule border-b bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
          <Link href="/" className="wordmark text-xl">
            Causa.
          </Link>
          <p className="eyebrow text-ink/60">Workbench — your files, this browser, nothing uploaded</p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="max-w-3xl font-serif text-4xl sm:text-5xl">Run it on your files.</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/80">
          Two exports and a join key — the same floor the product asks for. Everything on this
          page computes in your browser; no row leaves the tab.
        </p>

        {/* What to export */}
        <div className="rule mt-8 grid max-w-4xl gap-6 border-y py-6 md:grid-cols-3">
          <div>
            <p className="eyebrow text-ink/60">1 · Agent activity</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              One CSV of runs: an ID for the thing each run touched, plus agent, model, and cost
              columns if you have them. From your vendor&rsquo;s dashboard, LangSmith/Langfuse,
              or — on Databricks — your serving inference table or MLflow trace export
              (request_id or conversation_id is usually the key).
            </p>
          </div>
          <div>
            <p className="eyebrow text-ink/60">2 · Outcomes</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              One CSV from the system of record: the same ID, what happened (ticket resolved,
              opportunity created, payment settled), and a status column for the quality bar.
            </p>
          </div>
          <div>
            <p className="eyebrow text-ink/60">3 · The join key</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              The ID column both files share — ticket_id, opportunity_id, doc_id. That&rsquo;s
              the floor. Causa reports how much of your fleet it covers before anything else.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="btn-ink" onClick={loadSamples} disabled={loadingSamples}>
            {loadingSamples ? "Loading…" : "Load sample files"}
          </button>
          <a href="/samples/sample-agent-activity.csv" download className="text-sm underline underline-offset-4">
            sample-agent-activity.csv
          </a>
          <a href="/samples/sample-outcomes.csv" download className="text-sm underline underline-offset-4">
            sample-outcomes.csv
          </a>
        </div>

        {/* Uploads */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <FilePanel
            label="Agent activity export"
            hint="Runs: who ran, when, against which entity."
            file={activity}
            onLoad={applyActivity}
          />
          <FilePanel
            label="Outcomes export"
            hint="What landed in the system of record."
            file={outcomes}
            onLoad={applyOutcomes}
          />
        </div>

        {/* Mapping */}
        {activity && outcomes && (
          <div className="mt-8 border border-hairline bg-white/40 p-5">
            <h2 className="font-serif text-xl">Map the columns</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ColumnSelect
                label="Activity — join key"
                headers={activity.csv.headers}
                value={activityKeyCol}
                onChange={setActivityKeyCol}
              />
              <ColumnSelect
                label="Outcomes — join key"
                headers={outcomes.csv.headers}
                value={outcomeKeyCol}
                onChange={setOutcomeKeyCol}
              />
              <ColumnSelect
                label="Agent / workflow"
                headers={activity.csv.headers}
                value={agentCol}
                onChange={setAgentCol}
                allowNone
              />
              <ColumnSelect
                label="Model"
                headers={activity.csv.headers}
                value={modelCol}
                onChange={setModelCol}
                allowNone
              />
              <ColumnSelect
                label="Cost per run"
                headers={activity.csv.headers}
                value={costCol}
                onChange={setCostCol}
                allowNone
              />
              <ColumnSelect
                label="Outcome status (quality bar)"
                headers={outcomes.csv.headers}
                value={statusCol}
                onChange={(i) => {
                  setStatusCol(i);
                  if (outcomes && i !== -1) {
                    setPassValues(guessPassValues(distinctValues(outcomes.csv, i)));
                  }
                }}
                allowNone
              />
            </div>
            {statusCol !== -1 && statusOptions.length > 0 && (
              <fieldset className="mt-4">
                <legend className="eyebrow text-ink/60">Which statuses pass the quality bar?</legend>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {statusOptions.map(({ value, count }) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={passValues.has(value)}
                        onChange={(e) => {
                          const next = new Set(passValues);
                          if (e.target.checked) next.add(value);
                          else next.delete(value);
                          setPassValues(next);
                        }}
                        className="h-4 w-4 accent-ink"
                      />
                      <span className="font-mono text-xs">
                        {value} ({fmtInt(count)})
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <section className="mt-10" aria-live="polite">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-serif text-3xl">Your funnel</h2>
              <p className="font-mono text-xs text-ink/70">
                {fmtInt(result.activityRows)} runs · {fmtInt(result.outcomeRows)} outcome rows ·
                computed in this tab
              </p>
            </div>

            <div className="rule mt-4 grid gap-6 border-y py-6 md:grid-cols-3">
              <FunnelBar label="Claimed" value={result.claimed} max={result.claimed} />
              <FunnelBar label="Verified (your quality bar)" value={result.verified} max={result.claimed} />
              <FunnelBar label="Joined to an agent" value={result.joined} max={result.claimed} green />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <p>
                Join coverage: <span className="font-mono font-medium">{result.joinCoveragePct}%</span>{" "}
                of verified outcomes
              </p>
              <p>
                Runs carrying a key: <span className="font-mono font-medium">{result.keyCoveragePct}%</span>
              </p>
              {result.totalCost !== null && (
                <p>
                  Activity cost: <span className="font-mono font-medium">{fmtUsd(result.totalCost)}</span>
                  {result.costPerVerifiedJoined !== null && (
                    <>
                      {" "}
                      · per verified &amp; joined outcome:{" "}
                      <span className="font-mono font-medium">
                        {fmtUsd(result.costPerVerifiedJoined)}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Per-agent table */}
            {result.agents.length > 0 && (
              <div className="mt-8 overflow-x-auto border border-hairline">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="rule border-b text-left">
                      <th className="eyebrow py-2 pl-4 pr-3 font-normal text-ink/60">Agent</th>
                      <th className="eyebrow px-3 py-2 text-right font-normal text-ink/60">Runs</th>
                      <th className="eyebrow px-3 py-2 text-right font-normal text-ink/60">
                        Outcomes joined
                      </th>
                      <th className="eyebrow px-3 py-2 text-right font-normal text-ink/60">
                        Verified &amp; joined
                      </th>
                      <th className="eyebrow py-2 pl-3 pr-4 text-right font-normal text-ink/60">
                        $ / verified outcome
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.agents.map((a) => (
                      <tr key={a.agent} className="rule border-b last:border-b-0">
                        <td className="py-2 pl-4 pr-3 font-medium">{a.agent}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtInt(a.runs)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtInt(a.outcomesJoined)}</td>
                        <td className="px-3 py-2 text-right font-mono text-ledger">
                          {fmtInt(a.verifiedJoined)}
                        </td>
                        <td className="py-2 pl-3 pr-4 text-right font-mono">
                          {a.costPerVerified === null ? "—" : fmtUsd(a.costPerVerified)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Per-model split */}
            {result.models.length > 1 && (
              <div className="mt-4 overflow-x-auto border border-hairline">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="rule border-b text-left">
                      <th className="eyebrow py-2 pl-4 pr-3 font-normal text-ink/60">Model</th>
                      <th className="eyebrow px-3 py-2 text-right font-normal text-ink/60">Runs</th>
                      <th className="eyebrow px-3 py-2 text-right font-normal text-ink/60">
                        Verified &amp; joined
                      </th>
                      <th className="eyebrow py-2 pl-3 pr-4 text-right font-normal text-ink/60">
                        $ / verified outcome
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.models.map((m) => (
                      <tr key={m.model} className="rule border-b last:border-b-0">
                        <td className="py-2 pl-4 pr-3 font-mono text-xs">{m.model}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtInt(m.runs)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtInt(m.verifiedJoined)}</td>
                        <td className="py-2 pl-3 pr-4 text-right font-mono">
                          {m.costPerVerified === null ? "—" : fmtUsd(m.costPerVerified)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="mt-10 border border-ink bg-white/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl">What the record recommends</h2>
                    <p className="mt-1 text-sm text-ink/70">
                      Rules-based — grade D, where every engagement starts. Holdouts and rollout
                      history raise the grade.
                    </p>
                  </div>
                  <Stamp trigger="mount" active>
                    <span className="border-2 border-ink px-2 py-0.5 font-serif text-sm uppercase">
                      Drafted
                    </span>
                  </Stamp>
                </div>
                <div className="mt-4">
                  {result.recommendations.map((r) => (
                    <div key={r.line} className="rule border-t py-3">
                      <p className="text-[15px] font-medium">{r.line}</p>
                      <p className="mt-1 max-w-3xl text-sm text-ink/70">{r.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button className="btn-ink" onClick={() => setLeadOpen(true)}>
                Get statement
              </button>
              <p className="max-w-xl text-sm text-ink/70">
                This is the floor — deterministic joins on your own exports. The statement adds
                verification against the system of record, counterfactuals, evidence grades,
                and the drafted artifacts.
              </p>
            </div>
          </section>
        )}

        <p className="mt-16 text-xs text-ink/60">
          Causa provides operational outcome verification. Not accounting, audit, or assurance
          services. Files are processed in your browser and are not transmitted.
        </p>
      </main>

      {leadOpen && <LeadCapture onClose={() => setLeadOpen(false)} />}
    </div>
  );
}
