import type { Card } from "./card";
import type { Ref, VennResult } from "./match-schema";
import { answerList, findAnswer, type Answer } from "./answers";
import { normalise, normaliseQuote, wordCount } from "./normalise";

// The guard is the heart of the trust story: Claude decides, code checks.
// It is a pure function — same input, same answer — so it's easy to test.

export type GuardResult = { ok: true; result: VennResult; problems: string[]; styleProblems: string[] } | { ok: false; problems: string[]; styleProblems: string[] };

export const STOCK_PHRASES = ["What's the story behind", "Tell each other about", "Tell us about", "If you could", "Have you ever", "Share your", "Fun fact", "Both of you", "Did you know"];
const styleWords = (text: string) => normalise(text).replace(/[^\p{L}\p{N}'\s]/gu, " ").replace(/\s+/g, " ").trim();

export function checkStyle(output: VennResult, a: Card, b: Card): string[] {
  const issues = new Set<string>();
  const answers = [...answerList(a, "A"), ...answerList(b, "B")].map(x => styleWords(x.text).split(" "));
  const phrases = answers.flatMap(words => words.slice(0, Math.max(0, words.length - 5)).map((_, i) => words.slice(i, i + 6).join(" ")));
  for (const text of [output.headline, output.detail, ...output.starters.map(s => s.text), output.challenge.text]) {
    if (/["“”„«»]/u.test(text)) issues.add("S1: Don't put answers in quotation marks; weave them in.");
    const normal = styleWords(text);
    if (phrases.some(p => (` ${normal} `).includes(` ${p} `))) issues.add("S2: Don't copy answers word for word; say it in your own words.");
    for (const phrase of STOCK_PHRASES) if (normal.includes(styleWords(phrase))) issues.add(`S3: Avoid the stock phrase '${phrase}'.`);
  }
  const beginnings = output.starters.map(s => styleWords(s.text).split(" ").slice(0, 2).join(" "));
  if (new Set(beginnings).size !== beginnings.length) issues.add("S4: Start each of the three starters differently.");
  return [...issues];
}

const LIMITS = { headline: 90, detail: 200, starter: 160, challenge: 200 };
// We never show scores or romance. This catches the common ways it sneaks in.
const BANNED = /\d+\s?%|compatib|soul ?mate|romantic|flirt|out of 10|\d+\s?\/\s?10/i;

/** Finds the answer a reference points at: "A3" (core) or "A-fo2" (pack). Only
 * answers in that person's list exist, so skipped pack questions can't be cited. */
function lookup(ref: Ref, side: "A" | "B", card: Card): Answer | null {
  return findAnswer(answerList(card, side), ref.answer_id) ?? null;
}

/** Why: multiple-choice picks are shared by half the room, so the main link must
 * rest on something someone actually wrote, or Venn becomes "you both like music". */
function checkLinkSpecificity(link: VennResult["link"], a: Card, b: Card): string | null {
  const core = [lookup(link.a, "A", a), lookup(link.b, "B", b)].some((x) => x?.kind === "core");
  return core ? null : `The main link must cite at least one free-text answer (A1–A${a.a.length} or B1–B${b.a.length}).`;
}

/** Rule 1 + 2: the answer exists and the quote really is in it. */
function checkRef(ref: Ref, side: "A" | "B", card: Card, where: string): string | null {
  const answer = lookup(ref, side, card);
  if (!answer) return `${where}: "${ref.answer_id}" is not one of ${side}'s answer ids (${side}1-${side}${card.a.length} or an answered ${side}-pack id).`;
  const q = normaliseQuote(ref.quote);
  if (q.length < 2) return `${where}: the quote is too short.`;
  if (wordCount(q) > 6) return `${where}: the quote must be at most 6 words.`;
  if (!normalise(answer.text).includes(q)) return `${where}: "${ref.quote}" is not copied exactly from ${ref.answer_id}.`;
  return null;
}

/** Rule 5: no scoring or romance — unless the student themselves wrote those words. */
function checkTone(text: string, where: string, allAnswers: string): string | null {
  const m = BANNED.exec(text);
  if (!m) return null;
  if (allAnswers.includes(normalise(m[0]))) return null;
  return `${where}: no scores, percentages or romantic language.`;
}

function checkLength(text: string, max: number, where: string): string | null {
  if (!text.trim()) return `${where} is empty.`;
  if (text.length > max) return `${where} is longer than ${max} characters.`;
  return null;
}

export function checkMatch(output: VennResult, a: Card, b: Card, avoid: string[] = []): GuardResult {
  const problems: string[] = [];
  const styleProblems = checkStyle(output, a, b);
  const allAnswers = normalise([...a.a, ...b.a].map(([, t]) => t).join(" | "));
  const add = (p: string | null) => p && problems.push(p);

  add(checkLength(output.headline, LIMITS.headline, "Headline"));
  add(checkLength(output.detail, LIMITS.detail, "Detail"));
  add(checkTone(output.headline, "Headline", allAnswers));
  add(checkTone(output.detail, "Detail", allAnswers));
  add(checkRef(output.link.a, "A", a, "Link A"));
  add(checkRef(output.link.b, "B", b, "Link B"));
  add(checkLinkSpecificity(output.link, a, b));

  // Rule 3: keep the first 3 starters that pass every check.
  const avoidSet = new Set(avoid.map(normalise));
  const seen = new Set<string>();
  const good: VennResult["starters"] = [];
  const starterProblems: string[] = [];
  output.starters.forEach((s, i) => {
    const where = `Starter ${i + 1}`;
    const n = normalise(s.text);
    const issues = [
      checkLength(s.text, LIMITS.starter, where),
      checkTone(s.text, where, allAnswers),
      checkRef(s.a, "A", a, `${where} A`),
      checkRef(s.b, "B", b, `${where} B`),
      // Rule 6: fresh — not a duplicate, not something already shown.
      seen.has(n) ? `${where} repeats another starter.` : null,
      avoidSet.has(n) ? `${where} was already shown.` : null,
    ].filter((x): x is string => !!x);
    if (issues.length === 0 && good.length < 3) {
      good.push(s);
      seen.add(n);
    } else starterProblems.push(...issues);
  });
  if (good.length < 3) problems.push(...starterProblems, `Need exactly 3 valid starters, got ${good.length}.`);

  add(checkLength(output.challenge.text, LIMITS.challenge, "Challenge"));
  add(checkTone(output.challenge.text, "Challenge", allAnswers));
  add(checkRef(output.challenge.a, "A", a, "Challenge A"));
  add(checkRef(output.challenge.b, "B", b, "Challenge B"));

  const ids = new Set([...answerList(a, "A"), ...answerList(b, "B")].map(x => x.id.toUpperCase()));
  const canonical = (id: string) => id.trim().toUpperCase();
  const cited = new Set([output.link, ...output.starters, output.challenge].flatMap(x => [canonical(x.a.answer_id), canonical(x.b.answer_id)]));
  for (const reading of output.readings) {
    if (!ids.has(canonical(reading.answer_id))) problems.push("Reading references an answer that doesn't exist.");
    add(checkLength(reading.gloss, 80, "Reading gloss"));
  }
  for (const id of cited) if (output.readings.filter(r => canonical(r.answer_id) === id).length !== 1) problems.push(`Need exactly one reading for ${id}.`);
  const unknown = (id: string) => output.readings.find(r => canonical(r.answer_id) === canonical(id))?.kind === "unknown";
  if (unknown(output.link.a.answer_id) && unknown(output.link.b.answer_id)) problems.push("The main link can't rest on two answers you didn't recognise.");

  if (problems.length) return { ok: false, problems, styleProblems };
  return { ok: true, result: { ...output, starters: good }, problems, styleProblems };
}
