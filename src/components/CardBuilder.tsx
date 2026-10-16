import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Shuffle } from "lucide-react";
import { getPrompt, randomPrompts, PROMPT_IDS, type PromptId } from "@/lib/prompts";
import { CardSchema, createCard, type Card } from "@/lib/card";
import { cardLink, MAX_LINK } from "@/lib/codec";

type Props = {
  initial?: Card | null;
  header?: React.ReactNode;
  onDone: (card: Card) => void;
  onCancel?: () => void;
};

export function CardBuilder({ initial, header, onDone, onCancel }: Props) {
  const [prompts, setPrompts] = useState<PromptId[]>(() => initial?.a.map(([p]) => p) ?? randomPrompts(5));
  const [answers, setAnswers] = useState<string[]>(() => initial?.a.map(([, t]) => t) ?? ["", "", "", "", ""]);
  const [name, setName] = useState(initial?.n ?? "");
  const [course, setCourse] = useState(initial?.c ?? "");
  const [step, setStep] = useState(0); // 0-4 prompts, 5 name
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setError(null);
  }, [step]);

  const isName = step === 5;
  const current = answers[step] ?? "";
  const canNext = isName ? name.trim().length > 0 : current.trim().length > 0;

  function swap() {
    const unused = PROMPT_IDS.filter((id) => !prompts.includes(id));
    const next = unused[Math.floor(Math.random() * unused.length)];
    if (!next) return;
    setPrompts((p) => p.map((x, i) => (i === step ? next : x)));
    setAnswers((a) => a.map((x, i) => (i === step ? "" : x)));
    inputRef.current?.focus();
  }

  function next() {
    if (!canNext) return;
    if (!isName) return setStep(step + 1);
    const card = createCard({ id: initial?.id, n: name, c: course, a: prompts.map((p, i): [PromptId, string] => [p, answers[i] ?? ""]), p: initial?.p });
    const parsed = CardSchema.safeParse(card);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Something on your card isn't quite right.");
    if (cardLink(parsed.data, window.location.origin).length > MAX_LINK)
      return setError("Your card is a bit long for a QR code. Shorten an answer or two.");
    onDone(parsed.data);
  }

  function back() {
    if (step === 0) onCancel?.();
    else setStep(step - 1);
  }

  return (
    <form
      className="flex min-h-[70vh] flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
    >
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="btn-quiet -ml-3" disabled={step === 0 && !onCancel}>
          <ArrowLeft size={20} strokeWidth={1.75} /> Back
        </button>
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i <= step ? "bg-clay" : "bg-sand"}`} />
          ))}
        </div>
      </div>

      {header && step === 0 && <div className="mt-4 rounded-[20px] bg-oat p-4 text-base">{header}</div>}

      <div className="mt-6 flex-1">
        {!isName ? (
          <>
            <p className="text-sm text-ink-soft">Question {step + 1} of 5</p>
            <label htmlFor="answer" className="font-display mt-2 block text-[28px] font-medium">
              {getPrompt(prompts[step] ?? "fd").text}
            </label>
            <input
              ref={inputRef}
              id="answer"
              className="field mt-6"
              value={current}
              maxLength={60}
              enterKeyHint="next"
              autoCapitalize="sentences"
              autoComplete="off"
              placeholder={getPrompt(prompts[step] ?? "fd").placeholder}
              onChange={(e) => setAnswers((a) => a.map((x, i) => (i === step ? e.target.value : x)))}
            />
            <div className="mt-2 flex justify-between gap-4 text-sm text-ink-soft">
              <span>{step === 0 ? "Be specific: a name, a place, a detail." : ""}</span>
              <span className={current.length >= 50 ? "font-semibold text-clay-ink" : ""}>{current.length}/60</span>
            </div>
            <button type="button" onClick={swap} className="btn-quiet -ml-3 mt-4">
              <Shuffle size={20} strokeWidth={1.75} /> Different question
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">Last step</p>
            <label htmlFor="name" className="font-display mt-2 block text-[28px] font-medium">
              What should people call you?
            </label>
            <input
              ref={inputRef}
              id="name"
              className="field mt-6"
              value={name}
              maxLength={20}
              autoComplete="given-name"
              enterKeyHint="next"
              placeholder="First name"
              onChange={(e) => setName(e.target.value)}
            />
            <label htmlFor="course" className="mt-6 block text-base font-medium">Course (optional)</label>
            <input id="course" className="field mt-2" value={course} maxLength={40} enterKeyHint="done" placeholder="e.g. Economics" onChange={(e) => setCourse(e.target.value)} />
            <p className="mt-3 text-sm text-ink-soft">First name only. Anyone who scans you sees your answers.</p>
          </>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl bg-clay-pale p-3 text-sm">{error}</p>}
      </div>

      <div className="sticky bottom-0 bg-paper pb-4 pt-4">
        <button type="submit" className="btn-primary" disabled={!canNext}>
          {isName ? "Make my code" : "Next"}
        </button>
      </div>
    </form>
  );
}
