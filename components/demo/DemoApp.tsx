"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { company, fmt, headers } from "@/lib/data";
import Screen1Define from "./Screen1Define";
import Screen2Connect from "./Screen2Connect";
import Screen3Statement, { type Persona } from "./Screen3Statement";
import Screen4Verdicts from "./Screen4Verdicts";

type ScreenId = 1 | 2 | 3 | 4;

const SCREENS: { id: ScreenId; label: string }[] = [
  { id: 1, label: "Define outcomes" },
  { id: 2, label: "Connect sources" },
  { id: 3, label: "Statement" },
  { id: 4, label: "Verdicts" },
];

/** Pitch order: 1 → 2 → 3 CFO → 3 Team → 4. */
const PRESENTER_PATH: { screen: ScreenId; persona?: Persona }[] = [
  { screen: 1 },
  { screen: 2 },
  { screen: 3, persona: "CFO" },
  { screen: 3, persona: "Team" },
  { screen: 4 },
];

export default function DemoApp() {
  const [screen, setScreen] = useState<ScreenId>(1);
  const [persona, setPersona] = useState<Persona>("CFO");
  const [step, setStep] = useState(0);
  const [framed, setFramed] = useState(true);

  const goTo = useCallback((next: ScreenId) => {
    setScreen(next);
    setStep(PRESENTER_PATH.findIndex((s) => s.screen === next));
    window.scrollTo({ top: 0 });
  }, []);

  const nextStep = useMemo(
    () => (step < PRESENTER_PATH.length - 1 ? PRESENTER_PATH[step + 1] : null),
    [step]
  );

  const advance = useCallback(() => {
    if (!nextStep) return;
    setScreen(nextStep.screen);
    if (nextStep.persona) setPersona(nextStep.persona);
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  }, [nextStep, step]);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Persistent sample-data banner */}
      <div className="rule border-b bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
          <Link href="/" className="wordmark text-xl">
            Causa.
          </Link>
          <p className="eyebrow text-ink/60">Sample data — Meridian (fictional)</p>
        </div>
      </div>

      {/* Mobile screen tabs */}
      <nav
        aria-label="Demo screens"
        className="rule sticky top-0 z-20 border-b bg-paper md:hidden"
      >
        <div className="flex overflow-x-auto">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              onClick={() => goTo(s.id)}
              aria-current={screen === s.id ? "page" : undefined}
              className={`min-h-[44px] shrink-0 whitespace-nowrap px-4 text-sm ${
                screen === s.id ? "border-b-2 border-ink font-medium" : "text-ink/60"
              }`}
            >
              {s.id}. {s.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-6 md:py-10">
        {/* Left rail — free navigation */}
        <nav aria-label="Demo screens" className="hidden w-48 shrink-0 md:block">
          <ol className="sticky top-8 space-y-1">
            {SCREENS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => goTo(s.id)}
                  aria-current={screen === s.id ? "page" : undefined}
                  className={`flex min-h-[44px] w-full items-baseline gap-2 border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                    screen === s.id
                      ? "border-ink font-medium"
                      : "border-hairline text-ink/60 hover:text-ink"
                  }`}
                >
                  <span className="font-mono text-xs">{s.id}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Screen content */}
        <main className="min-w-0 flex-1 pb-24">
          {framed && (
            <div className="rule mb-8 border border-hairline bg-white/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="max-w-2xl text-[15px] leading-relaxed">
                  This is {company.name}&rsquo;s June statement — {company.headcount} people,
                  four agent workflows, {fmt.usd(headers.spend)}/mo in agent spend.
                </p>
                <button
                  onClick={() => setFramed(false)}
                  aria-label="Dismiss"
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-ink/60 hover:text-ink"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {screen === 1 && <Screen1Define onConnect={() => goTo(2)} />}
          {screen === 2 && <Screen2Connect />}
          {screen === 3 && <Screen3Statement persona={persona} onPersona={setPersona} />}
          {screen === 4 && <Screen4Verdicts />}

          <p className="mt-12 text-xs text-ink/60">
            Causa provides operational outcome verification. Not accounting, audit, or
            assurance services.
          </p>
        </main>
      </div>

      {/* Bottom rail — quiet presenter path */}
      {nextStep && (
        <div className="rule fixed inset-x-0 bottom-0 z-20 border-t bg-paper/95">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5">
            <span className="font-mono text-[11px] text-ink/60">
              {SCREENS.find((s) => s.id === screen)?.label}
              {screen === 3 ? ` — ${persona} view` : ""}
            </span>
            <button
              onClick={advance}
              className="min-h-[44px] px-3 text-sm text-ink/70 transition-colors hover:text-ink"
            >
              Next: {SCREENS.find((s) => s.id === nextStep.screen)?.label}
              {nextStep.persona && nextStep.screen === 3 && screen === 3
                ? ` — ${nextStep.persona} view`
                : ""}{" "}
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
