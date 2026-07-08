"use client";

import { useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/motion";

const SPEND_OPTIONS = ["<$5K", "$5–25K", "$25–100K", "$100K+"];

type Errors = { name?: string; email?: string; spend?: string; submit?: string };

export default function LeadCapture({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [spend, setSpend] = useState("");
  const [doing, setDoing] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const firstField = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a work email.";
    if (!spend) next.spend = "Select a range.";
    return next;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const endpoint = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT;
    if (!endpoint) {
      setErrors({
        submit: "Form endpoint is not configured. Set NEXT_PUBLIC_FORMSPREE_ENDPOINT (see README).",
      });
      return;
    }
    setState("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, monthlyAgentSpend: spend, agentsDoing: doing }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setState("done");
    } catch {
      setState("idle");
      setErrors({ submit: "Submission failed. Try again, or email us directly." });
    }
  };

  const field =
    "mt-1 block min-h-[44px] w-full border border-ink/60 bg-paper px-3 py-2 text-[15px] aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";
  const errText = "mt-1 block text-sm font-medium text-ink";

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-ink/25"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Get statement"
        className="absolute inset-0 overflow-y-auto bg-paper p-6 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:border-ink/20 sm:p-8 sm:shadow-[0_12px_40px_rgba(16,16,16,0.12)]"
      >
        {state === "done" ? (
          <div className="flex min-h-[320px] flex-col items-start justify-center">
            <Stamp trigger="mount" active>
              <span className="border-2 border-ink px-4 py-1.5 font-serif text-3xl uppercase">
                Received.
              </span>
            </Stamp>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed">
              Your first Verified Outcome Statement lands days after your data does. We&rsquo;ll
              reply within one business day with the export checklist — two files and a join
              key.
            </p>
            <button className="btn-outline mt-8" onClick={onClose}>
              Close form
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-3xl">Get statement</h2>
              <button
                onClick={onClose}
                aria-label="Close form"
                className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-lg hover:border-ink"
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-sm text-ink/70">
              Your first Verified Outcome Statement, days from your data — from $7,500, credited
              against your first year. Have three things ready: an export of agent activity, an export of
              outcomes (Zendesk, Jira, Stripe…), and the ID column they share — ticket_id
              works.
            </p>
            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="eyebrow text-ink/60">Name</span>
                <input
                  ref={firstField}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={!!errors.name}
                  className={field}
                />
                {errors.name && <span className={errText}>{errors.name}</span>}
              </label>
              <label className="block text-sm">
                <span className="eyebrow text-ink/60">Work email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  className={field}
                />
                {errors.email && <span className={errText}>{errors.email}</span>}
              </label>
              <label className="block text-sm">
                <span className="eyebrow text-ink/60">Monthly agent spend</span>
                <select
                  value={spend}
                  onChange={(e) => setSpend(e.target.value)}
                  aria-invalid={!!errors.spend}
                  className={field}
                >
                  <option value="" disabled>
                    Select a range
                  </option>
                  {SPEND_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {errors.spend && <span className={errText}>{errors.spend}</span>}
              </label>
              <label className="block text-sm">
                <span className="eyebrow text-ink/60">What are your agents doing? (optional)</span>
                <input
                  type="text"
                  value={doing}
                  onChange={(e) => setDoing(e.target.value)}
                  className={field}
                />
              </label>
              {errors.submit && <p className={errText}>{errors.submit}</p>}
              <button type="submit" className="btn-ink w-full" disabled={state === "sending"}>
                {state === "sending" ? "Sending…" : "Get statement"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
