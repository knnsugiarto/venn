import type { Card } from "./card";
import { getPrompt } from "./prompts";
import { PACKS, themeOfPrompt } from "./packs";

// One list of a card's answers with their IDs, used by the prompt, guard, demo
// matcher and receipts so the IDs can never drift between them.
export type Answer = { id: string; label: string; text: string; kind: "core" | "pack"; source: string };

export function answerList(card: Card, side: "A" | "B"): Answer[] {
  const out: Answer[] = card.a.map(([p, t], i) => ({ id: `${side}${i + 1}`, label: `${themeOfPrompt(p).name} · ${getPrompt(p).text}`, text: t, kind: "core", source: getPrompt(p).short }));
  for (const pack of PACKS) {
    const ans = card.p?.[pack.id];
    if (!ans) continue;
    ans.forEach((opt, qi) => {
      if (opt === null) return;
      const question = pack.questions[qi];
      const text = question?.options[opt];
      if (!question || text === undefined) return;
      out.push({ id: `${side}-${pack.id}${qi + 1}`, label: `${pack.name} · ${question.q}`, text, kind: "pack", source: `${pack.name} pack` });
    });
  }
  return out;
}

export function findAnswer(list: Answer[], id: string): Answer | undefined {
  const want = id.trim().toUpperCase();
  return list.find((a) => a.id.toUpperCase() === want);
}
