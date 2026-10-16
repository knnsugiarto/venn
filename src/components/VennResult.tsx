import type { Card } from "@/lib/card";
import type { Ref, VennResult } from "@/lib/match-schema";
import { Link } from "@tanstack/react-router";
import { answerList, findAnswer } from "@/lib/answers";
import { normalise, normaliseQuote } from "@/lib/normalise";
import { VennGraphic } from "./VennGraphic";
import { ChallengeTimer } from "./ChallengeTimer";

type Props = {
  me: Card;
  them: Card;
  result: VennResult;
  demo: boolean;
  notice: string | null;
  onAnother: (() => void) | null;
  nudge?: boolean;
  onShowCode: () => void;
};

function sourceOf(ref: Ref, card: Card, side: "A" | "B") {
  return findAnswer(answerList(card, side), ref.answer_id)?.source ?? "answers";
}

function sourceLine(s: { a: Ref; b: Ref }, a: Card, b: Card) {
  return `from ${a.n}'s ${sourceOf(s.a, a, "A")} · ${b.n}'s ${sourceOf(s.b, b, "B")}`;
}

/** Highlights each quoted fragment inside an answer. */
function Highlighted({ text, quotes }: { text: string; quotes: string[] }) {
  const lower = normalise(text);
  const ranges: [number, number][] = [];
  for (const q of quotes) {
    const nq = normaliseQuote(q);
    const at = lower.indexOf(nq);
    // normalise can shift indices for odd whitespace; only highlight when lengths line up.
    if (at >= 0 && lower.length === text.length) ranges.push([at, at + nq.length]);
  }
  ranges.sort((x, y) => x[0] - y[0]);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([s, e], k) => {
    if (s < pos) return;
    parts.push(text.slice(pos, s));
    parts.push(<mark key={k} className="rounded bg-clay-pale px-0.5 text-ink">{text.slice(s, e)}</mark>);
    pos = e;
  });
  parts.push(text.slice(pos));
  return <>{parts}</>;
}

export function VennResultView({ me, them, result, demo, notice, onAnother, onShowCode, nudge }: Props) {
  const refs = [result.link, ...result.starters, result.challenge];
  const quotesFor = (side: "a" | "b", id: string) =>
    refs.map((r) => r[side]).filter((r) => r.answer_id.trim().toUpperCase() === id.toUpperCase()).map((r) => r.quote);
  const citedIds = (side: "a" | "b") => new Set(refs.map((r) => r[side].answer_id.trim().toUpperCase()));

  return (
    <div aria-live="polite" className="pb-4">
      {demo && (
        <div className="mb-3 flex justify-center">
          <span className="chip font-medium">Demo mode · not Claude</span>
        </div>
      )}
      {notice && <p className="mb-3 text-center text-sm text-ink-soft">{notice}</p>}
      <VennGraphic state="result" left={me.n} right={them.n} contrast={result.kind === "contrast"} />

      <section className="anim-fade-up mt-6">
        <p className="label-caps">{result.kind === "overlap" ? "What you share" : "Your best contrast"}</p>
        <h1 className="mt-2 text-[30px] font-semibold">{result.headline}</h1>
        <p className="mt-2 text-ink-soft">{result.detail}</p>
      </section>

      <section className="mt-8">
        <p className="label-caps">Ask each other</p>
        <ol className="mt-3 space-y-4">
          {result.starters.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-display text-xl font-semibold text-clay-ink">{i + 1}</span>
              <div>
                <p className="text-lg font-medium">{s.text}</p>
                <p className="mt-1 text-sm text-ink-soft">{sourceLine(s, me, them)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-[20px] bg-oat p-5">
        <p className="label-caps">Two-minute challenge</p>
        <p className="mt-2 text-lg font-medium">{result.challenge.text}</p>
        <p className="mt-1 text-sm text-ink-soft">{sourceLine(result.challenge, me, them)}</p>
        <div className="mt-4"><ChallengeTimer /></div>
      </section>

      <details className="mt-6 rounded-[20px] border border-sand p-4">
        <summary className="cursor-pointer font-medium">Show receipts</summary>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {([["a", me], ["b", them]] as const).map(([side, card]) => (
            <div key={side}>
              <p className="label-caps">{card.n}</p>
              <ul className="mt-2 space-y-3">
                {answerList(card, side === "a" ? "A" : "B")
                  .filter((x) => x.kind === "core" || citedIds(side).has(x.id.toUpperCase()))
                  .map((x) => (
                    <li key={x.id} className="text-sm">
                      <span className="block text-ink-soft">{x.label}</span>
                      <span className="block"><Highlighted text={x.text} quotes={quotesFor(side, x.id)} /></span>
                      {citedIds(side).has(x.id.toUpperCase()) && <span className="mt-1 block text-ink-soft">Read as: {result.readings.find(r => r.answer_id.trim().toUpperCase() === x.id.toUpperCase())?.gloss}</span>}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-soft">Everything above is built from what you both wrote. Our code checks every line against your answers, and shows how Claude read each one.</p>
      </details>

      <div className="mt-6 space-y-1 bg-paper pb-4 pt-3 text-center">
        {onAnother ? (
          <button className="btn-primary" onClick={onAnother}>Another one</button>
        ) : (
          <p className="font-display py-3 text-xl font-medium">That's plenty of help. Go talk!</p>
        )}
        {nudge && (
          <Link to="/" hash="themes" className="block py-2 text-sm text-ink-soft underline">Fill your circle for sharper Venns</Link>
        )}
        <button className="btn-quiet" onClick={onShowCode}>Show my code</button>
      </div>
    </div>
  );
}
