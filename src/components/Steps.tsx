import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getPrompt, type PromptId } from "@/lib/prompts";

export function StepTop({ onBack, label, dots, at }: { onBack?: (() => void) | undefined; label?: string; dots: number; at: number }) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" className="btn-quiet -ml-3" onClick={onBack} disabled={!onBack}>
        <ArrowLeft size={20} strokeWidth={1.75} /> Back
      </button>
      {label && <span className="font-medium">{label}</span>}
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: dots }, (_, i) => <span key={i} className={`h-2 w-2 rounded-full ${i <= at ? "bg-clay" : "bg-sand"}`} />)}
      </div>
    </div>
  );
}

/** One typed prompt: "In your own words", 60 characters, Next + Skip. */
export function TypedStep({ prompt, initial, kicker = "In your own words", onNext, onSkip }: { prompt: PromptId; initial: string; kicker?: string; onNext: (text: string) => void; onSkip?: () => void }) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const p = getPrompt(prompt);
  return (
    <form className="mt-6 flex flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onNext(text.trim()); }}>
      <p className="text-sm text-ink-soft">{kicker}</p>
      <label htmlFor="typed" className="font-display mt-2 block text-[28px] font-medium">{p.text}</label>
      <input ref={ref} id="typed" className="field mt-6" value={text} maxLength={60} autoComplete="off" autoCapitalize="sentences" enterKeyHint="next" placeholder={p.placeholder} onChange={(e) => setText(e.target.value)} />
      <div className="mt-2 text-right text-sm text-ink-soft"><span className={text.length >= 50 ? "font-semibold text-clay-ink" : ""}>{text.length}/60</span></div>
      {onSkip && <button type="button" className="btn-quiet -ml-3 mt-2 self-start" onClick={onSkip}>Skip</button>}
      <div className="flex-1" />
      <div className="sticky bottom-0 bg-paper pb-4 pt-4"><button type="submit" className="btn-primary" disabled={!text.trim()}>Next</button></div>
    </form>
  );
}

export function NameStep({ initial, onNext }: { initial: string; onNext: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form
      className="mt-6 flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) return;
        if (!/^[\p{L}\p{M}' .-]+$/u.test(n)) return setError("Names can only use letters, spaces, hyphens and apostrophes");
        onNext(n);
      }}
    >
      <label htmlFor="name" className="font-display block text-[28px] font-medium">What should people call you?</label>
      <input ref={ref} id="name" className="field mt-6" value={name} maxLength={20} autoComplete="given-name" enterKeyHint="next" placeholder="First name" onChange={(e) => setName(e.target.value)} />
      <p className="mt-3 text-sm text-ink-soft">First name only. Anyone who scans you sees your answers.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-clay-pale p-3 text-sm">{error}</p>}
      <div className="flex-1" />
      <div className="sticky bottom-0 bg-paper pb-4 pt-4"><button type="submit" className="btn-primary" disabled={!name.trim()}>Next</button></div>
    </form>
  );
}
